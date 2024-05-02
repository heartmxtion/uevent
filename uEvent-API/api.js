import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import multer from 'multer';
import path from 'path';
import jwt from 'jsonwebtoken';
import {setHash, generateToken, findUser, findCompany, saveUser} from './utils.js'
import db from './db.js'
import moment from 'moment-timezone';
import tzlookup from 'tz-lookup';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';

const pdfPath = 'purchase_receipt.pdf';

const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const postFileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'post_files/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const uploadAvatar = multer({ storage: avatarStorage });
const uploadPostFile = multer({ storage: postFileStorage });

const app = express();
const PORT = process.env.PORT || 3000;
const secretKey = generateToken();
console.log("Секретный ключ: " + secretKey);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use('/post_files', express.static('post_files'));

const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 587,
	secure: false,
	service: 'gmail',
	auth: {
		user: 'usof.propaganda@gmail.com',
		pass: 'ftfn zdhe dbit fkep'
	}
});

const verifyToken = (token) => {
	try {
	  return jwt.verify(token, secretKey);
	} catch (err) {
	  console.error('Ошибка проверки токена:', err);
	  throw new Error('Недействительный токен');
	}
};

async function checkUserAccessAdminComment(userId, commentId, res) {
	try {
	  const user = await findUser(`user_id = ${userId}`);
	  if (!user) {
		return false
	  }
  
	  const [author] = await db.promise().query('SELECT user_id FROM comments WHERE comment_id = ?', [commentId]);
	 
	  const [userRole] = await db.promise().query('SELECT role FROM users WHERE user_id = ?', [userId]);
	  
	  if (userId != author[0].user_id) {
		return false
	  }
  
	  return true;
	} catch (error) {
	  console.error('Ошибка проверки доступа:', error);
	  return false;
	}
}

async function checkUserAccessAdminPost(userId, postId, res) {
  try {
    const user = await findUser(`user_id = ${userId}`);
    if (!user) {
      return false;
    }

    const [author] = await db.promise().query('SELECT author_id FROM posts WHERE id = ?', [postId]);
    const [authorProfileToken] = await db.promise().query('SELECT profile_token FROM users WHERE id = ?', [author[0].author_id]);
    const [userRole] = await db.promise().query('SELECT role FROM users WHERE id = ?', [userId]);
    
    if (authorProfileToken[0].profile_token !== user.profile_token && userRole[0].role !== 'admin') {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Ошибка проверки доступа:', error);
    return false;
  }
}

app.post('/api/auth/register', async (req, res) => {
	const { login, email, password, password_confirmation } = req.body;

	try {
		const existingUser = await findUser(`login = '${login}' OR email = '${email}'`);
		if (existingUser) {
			return res.status(400).json({ message: 'User with such username or email already exist' });
		}
		console.log(password_confirmation);
		console.log(password);
		if(password_confirmation != password) {
			return res.status(400).json({ message: 'Passwords does not match' });
		}
		    if (password.length < 8) {
      return res.status(400).json({ message: 'The password must contain at least 8 characters' });
    }

    if (!/\d/.test(password)) {
      return res.status(400).json({ message: 'The password must contain at least one number' });
    }

    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
      return res.status(400).json({ message: 'The password must contain upper and lower case letters' });
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return res.status(400).json({ message: 'The password must contain at least one special character' });
    }
		const hashedPass = setHash(password); 
		const newUser = await saveUser(login, email, hashedPass);
		const confirmToken = generateToken();
		await db.promise().query(
			'UPDATE users SET confirm_token = ? WHERE user_id = ?',
			[confirmToken, newUser.user_id]
		);
		const mailOptions = {
			from: 'uevent.propaganda@gmail.com',
			to: email,
			subject: 'uevent: Email confirmation',
			html: `
				<div style="background-color: #f2f2f2; color: #333; padding: 20px; border-radius: 10px; width: 400px; margin: 0 auto;">
					<h1 style="text-align: center; margin-bottom: 20px;">uevent: Email confirmation</h1>
					<p style="text-align: center;">Click the button below to confirm your email:</p>
					<div style="text-align: center;">
						<a href="http://localhost:3001/confirm/${confirmToken}" style="display: inline-block; background-color: black; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;">Confirm</a>
					</div>
				</div>
			`
		};
		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				console.error('Email not sent:', error);
			} else {
				console.log('Email sent: ' + info.response);
			}
		});

		res.status(200).json({ message: 'Registration successfull' });
	} catch (error) {
		console.error('Error during registration:', error);
		res.status(500).json({ message: 'Error during registration' });
	}
});

app.get('/api/auth/confirm/:token', async (req, res) => {
	const { token } = req.params;
	try {
		const [result, _] = await db.promise().query(`SELECT * FROM users WHERE confirm_token = ?`, [token]);
		if (result.length === 0) {
			return res.status(400).send({ message: 'Invalid token' });
		}

		const userId = result[0].user_id;
		await db.promise().query('UPDATE users SET confirmed = 1, confirm_token = NULL WHERE user_id = ?', [userId]);

		return res.status(200).send({ message: 'Email successfully confirmed' });
	} catch (error) {
		console.error('Error during email confirmation:', error);
		res.status(500).json({ message: 'Error during email confirmation' });
	}
});


app.post('/api/auth/password-reset', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await findUser(`email = '${email}' AND confirmed = 1`);
        if (!user) {
            return res.status(400).json({ message: 'User with email address not found or email not verified' });
        } else {

        const confirmToken = generateToken();

        await db.promise().query(
            'UPDATE users SET confirm_token = ? WHERE user_id = ?',
            [confirmToken, user.user_id]
        );

        const mailOptions = {
			from: 'uevent.propaganda@gmail.com',
			to: email,
			subject: 'uevent: Password reset',
			html: `
				<div style="background-color: #f2f2f2; color: #333; padding: 20px; border-radius: 10px; width: 400px; margin: 0 auto;">
					<h1 style="text-align: center; margin-bottom: 20px;">uevent: Password reset</h1>
					<p style="text-align: center;">Click the button below to reset your password:</p>
					<div style="text-align: center;">
						<a href="http://localhost:3001/reset-password/${confirmToken}" style="display: inline-block; background-color: black; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;">Reset Password</a>
					</div>
				</div>
			`
		};

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error durind sending the email:', error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        res.status(200).json({ message: 'A password reset link has been sent to your email' });
	}
    } catch (error) {
        console.error('An error occurred while recovering your password:', error);
        res.status(500).json({ message: 'An error occurred while recovering your password' });
    }
});

app.post('/api/auth/password-reset/:token', async (req, res) => {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    try {
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'The password must contain at least 8 characters' });
        }
  
        if (!/\d/.test(newPassword)) {
            return res.status(400).json({ message: 'The password must contain at least one number' });
        }
  
        if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword)) {
            return res.status(400).json({ message: 'The password must contain upper and lower case letters' });
        }
  
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
            return res.status(400).json({ message: 'The password must contain at least one special character' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        const [result, _] = await db.promise().query(`SELECT * FROM users WHERE confirm_token = ?`, [token]);
        if (result.length === 0) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        const userId = result[0].user_id;
        const hashedPass = setHash(newPassword);

		if (result[0]['2fa_active']) {
			const decryptedKey = decrypt(result[0]['2fa_key'], result[0].password);
			const newKey = encrypt(decryptedKey, hashedPass);
			await db.promise().query('UPDATE users SET password = ?, 2fa_key = ?, confirm_token = NULL WHERE user_id = ?', [hashedPass, newKey, userId]);
		} else {
			await db.promise().query('UPDATE users SET password = ?, confirm_token = NULL WHERE user_id = ?', [hashedPass, userId]);
		}

        return res.status(200).json({ message: 'Password successfully reset' });
    } catch (error) {
        console.error('Error during password reset:', error);
        res.status(500).json({ message: 'Error during password reset' });
    }
});

app.post('/api/auth/login', async (req, res) => {
	const { username, password, '2faToken': twoFactorToken } = req.body;
  
	try {
		const user = await findUser(`login = '${username}' OR email = '${username}'`);

		if (!user.confirmed) {
			return res.status(400).json({ message: 'Email not confirmed' });
		}

		if (!user || !bcrypt.compareSync(password, user.password)) {
			return res.status(400).json({ message: 'Passwords do not match' });
		}
  
		if (user["2fa_active"]) {
			if (!twoFactorToken) {
				return res.status(200).json({ message: 'Two-factor authentication required', requires2FA: true });
			} else {
				const secretKey = decrypt(user['2fa_key'], user.password);

				const verified = speakeasy.totp.verify({
					secret: secretKey,
					encoding: 'hex',
					token: twoFactorToken
				});
		
				if (!verified) {
					return res.status(400).json({ message: 'Invalid two-factor authentication token' });
				}
			}
	  	}
  
		const payload = {
			userId: user.user_id,
			username: user.login,
			role: user.role,
		};
		console.log(payload);
		const options = {
			expiresIn: '24h',
		};
	
		const jwtToken = jwt.sign(payload, secretKey, options);
	
		res.status(200).json({ message: 'Authorization success', user: { userId: user.user_id, jwtToken: jwtToken } });
	} catch (error) {
		console.error('Error during the authorization:', error);
		res.status(500).json({ message: 'Error during the authorization' });
	}
});  

app.post('/api/auth/logout', async (req, res) => {
	try {
    	const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Token not found' });
		}

    	const token = authHeader.split(' ')[1];

		try {
			const decoded = verifyToken(token);
			const userId = decoded.userId;
			
			const user = await findUser(`user_id = ${userId}`);
			if (!user) {
				return res.status(404).json({ message: 'User not found' });
			}

			return res.status(200).json({ message: 'Logout user' });
		} catch (error) {
			console.error('Error during logout user:', error);
			return res.status(401).json({ message: 'Error during the  logout user' });
		}
	} catch (error) {
		console.error('Error during logout user:', error);
		return res.status(500).json({ message: 'Error during the logout user' });
	}
});

app.get('/api/users', async (req, res) => {
	try {
		const [users, _] = await db.promise().query(`SELECT user_id, login, full_name, email, avatar, role FROM users`);
		const filteredUsers = users.filter(user => user.full_name !== 'Deleted user');

    	res.status(200).json(filteredUsers);
	} catch (error) {
		console.error('Ошибка во время получения списка пользователей: ', error);
		return res.status(500).json({message: 'Произошла ошибка во время получения списка пользователей'});
	}
});

app.get('/api/:eventId/company/info', async (req, res) => {
	try {
	  const eventId = req.params.eventId;
	  
	  const sql = `SELECT companies.company_id, company_name, companies.email FROM companies INNER JOIN events ON companies.company_id = events.company_id WHERE events.event_id = ?`;
	  const [result] = await db.promise().query(sql, [eventId]);
	  
	  if (result.length > 0) {
		const { company_name, email, company_id } = result[0];
		console.log({ company_name, email, company_id });
		return res.status(200).json({ company_name, email, company_id });
	  } else {
		return res.status(404).json({ error: 'Компания не найдена' });
	  }
	} catch (error) {
	  console.error('Ошибка при получении информации о компании:', error);
	  res.status(500).json({ error: 'Ошибка при получении информации о компании' });
	}
});
  
app.get('/api/:eventID/userslist', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(404).json({ message: 'Token not found' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        const userId = decoded.userId;
        
        const eventId = req.params.eventID;

        const [eventRow] = await db.promise().query('SELECT non_participant FROM events WHERE event_id = ?', [eventId]);
        const { non_participant } = eventRow[0];

		if (!non_participant) {
			const [[{ isParticipant }]] = await db.promise().query('SELECT COUNT(*) as isParticipant FROM tickets WHERE user_id = ? AND event_id = ?', [userId, eventId]);
			if (!isParticipant) {
				return res.status(403).json({ error: 'Not a participant' });
			}
		}

        const sql = `
            SELECT user_id, login, full_name, avatar 
            FROM users 
            WHERE user_id IN (
            	SELECT DISTINCT user_id 
                FROM tickets 
                WHERE event_id = ? AND showName = TRUE
            )
        `;
        const [userRows] = await db.promise().query(sql, [eventId]);
        const usersWithId = userRows.map(user => ({ ...user, userId: user.user_id }));

        return res.status(200).json({ users: usersWithId });
    } catch (error) {
        console.error('Ошибка при получении списка пользователей для события:', error);
        res.status(500).json({ error: 'Ошибка при получении списка пользователей для события' });
    }  
});

app.post('/api/users', async (req, res) => {
	const authHeader = req.headers.authorization;
	const { login, email, password, passwordConfirm, role } = req.body;


	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(404).json({ message: 'Токен не найден' });
	}
	try {
		const token = authHeader.split(' ')[1];
		
		const decoded = verifyToken(token);
		const userId = decoded.userId;
		
		const user = await findUser(`user_id = '${userId}'`);
		if (!user) {
			return res.status(404).json({ message: 'Пользователь не найден' });
		}
			
		if (user.role !== 'admin') {
			return res.status(403).json({ message: 'Недостаточно прав' });
		}

		try {
			const existingUser = await findUser(`login = '${login}' OR email = '${email}'`);
			if (existingUser) {
				return res.status(400).json({ message: 'Пользователь с таким именем или email уже существует' });
			}
			if(passwordConfirm != password) {
				return res.status(400).json({ message: 'Пароли не совпадают!' });
			}
			const hashedPass = setHash(password); 
			const [dataUser, _] = await db.promise().query(
			'INSERT INTO users (login, email, password, role, confirmed) VALUES (?, ?, ?, ?, ?)',
			[login, email, hashedPass, role, 1]
			);
			res.status(200).json({ message: 'Пользователь создан успешно' });
		}catch (error) {
			console.error('Ошибка регистрации:', error);
			res.status(500).json({ message: 'Произошла ошибка при регистрации' });
		}
	} catch (error) {
		console.error('Ошибка регистрации:', error);
		res.status(401).json({ message: 'Недействительный токен' });
	}
	
});

app.post('/api/topics', async (req, res) => {
	const authHeader = req.headers.authorization;
	const { title } = req.body;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(404).json({ message: 'Токен не найден' });
	}
	try {
		const token = authHeader.split(' ')[1];
		
		const decoded = verifyToken(token);
		const userId = decoded.userId;
		
		const user = await findUser(`user_id = '${userId}'`);
		if (!user) {
			return res.status(404).json({ message: 'Пользователь не найден' });
		}
		
		if (user.role !== 'admin') {
			return res.status(403).json({ message: 'Недостаточно прав' });
		}

		try {
			const [dataTopic, _] = await db.promise().query(
			'INSERT INTO theme (theme_name) VALUES (?)',
			[title]
			);
			res.status(200).json({ message: 'Theme was successfully created' });
		}catch (error) {
			console.error('Error during theme creating:', error);
			res.status(500).json({ message: 'Error during theme creating' });
		}
	} catch (error) {
		console.error('Error during theme creating:', error);
		res.status(401).json({ message: 'Error during theme creating' });
	}
});

app.post('/api/formats', async (req, res) => {
	const authHeader = req.headers.authorization;
	const { title } = req.body;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(404).json({ message: 'Токен не найден' });
	}
	try {
		const token = authHeader.split(' ')[1];
		
		const decoded = verifyToken(token);
		const userId = decoded.userId;
		
		const user = await findUser(`user_id = '${userId}'`);
		if (!user) {
			return res.status(404).json({ message: 'Пользователь не найден' });
		}
			
		if (user.role !== 'admin') {
			return res.status(403).json({ message: 'Недостаточно прав' });
		}

		try {
			const [dataFormat, _] = await db.promise().query(
			'INSERT INTO format (format_name) VALUES (?)',
			[title]
			);
			res.status(200).json({ message: 'Format was successfully created' });
		}catch (error) {
			console.error('Error during format creating:', error);
			res.status(500).json({ message: 'Error during format creating' });
		}
	} catch (error) {
		console.error('Error during format creating:', error);
		res.status(401).json({ message: 'Error during format creating' });
	}
});

app.get('/api/events/company/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await findUser(`user_id = '${userId}'`);
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(404).json({ message: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (userId != decoded.userId && decoded.role !== 'admin') {
            return res.status(403);
        }

        const [companyEvents, _] = await db.promise().query('SELECT * FROM events WHERE company_id IN (SELECT company_id FROM companies WHERE user_id = ?)', [userId]);

        companyEvents.sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') {
                return -1;
            }
            if (a.status !== 'active' && b.status === 'active') {
                return 1;
            }
            return new Date(a.event_start_date) - new Date(b.event_start_date);
        });

        res.status(200).json(companyEvents);
    } catch (error) {
        console.error('Ошибка во время получения данных публикации: ', error);
        return res.status(500).json({message: 'Произошла ошибка во время получения данных публикации'});
    }
});

app.get('/api/profilevents/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await findUser(`user_id = '${userId}'`);
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(404).json({ message: 'Токен не найден' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        if (userId != decoded.userId && decoded.role !== 'admin') {
            return res.status(403);
        }

        const [eventsIds, _] = await db.promise().query('SELECT DISTINCT event_id FROM tickets WHERE user_id = ?', [userId]);

        const eventsData = [];
        for (const { event_id } of eventsIds) {
            const [eventData, __] = await db.promise().query('SELECT * FROM events WHERE event_id = ?', [event_id]);
            eventsData.push(eventData[0]);
        }

		eventsData.sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') {
                return -1;
            }
            if (a.status !== 'active' && b.status === 'active') {
                return 1;
            }
            return new Date(a.event_start_date) - new Date(b.event_start_date);
        });

        res.status(200).json(eventsData);
    } catch (error) {
        console.error('Ошибка во время получения данных публикации: ', error);
        return res.status(500).json({message: 'Произошла ошибка во время получения данных публикации'});
    }
});

app.get('/api/users/:userId', async (req, res) => {
	const { userId } = req.params;

	try {
		const [userResult, _] = await db.promise().query(`SELECT user_id, login, full_name, email, avatar, role, 2fa_active FROM users WHERE user_id = ${userId}`);
		if (!userResult[0]) {
		return res.status(404).json({ message: 'Пользователь не найден' });
		}

        const [companyResult, __] = await db.promise().query(`SELECT company_id FROM companies WHERE user_id = ${userId} AND approved = TRUE`);
        const hasCompany = companyResult.length > 0;
        const companyId = hasCompany ? companyResult[0].company_id : null;

        const userData = {
            ...userResult[0],
            hasCompany,
            companyId
        };

		return res.status(200).json(userData);
	} catch (error) {
		console.error('Ошибка получения данных пользователя:', error);
		return res.status(500).json({ message: 'Произошла ошибка при получении данных пользователя' });
	}
});

app.get('/api/userData', async (req, res) => {
	const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(404).json({ message: 'Token not found' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        const authorId = decoded.userId;
        const profileToken = decoded.profileToken;
        const user = await findUser(`user_id = ${authorId}`);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        try {
            if (user.profile_token !== profileToken) {
                return res.status(403).json({ message: 'Недостаточно прав для создания event' });
            }

            const [userdataRole] = await db.promise().query('SELECT role FROM users WHERE user_id = ?', [authorId]);
			const [userdataCompany] = await db.promise().query('SELECT company_id FROM companies WHERE user_id = ?', [authorId]);
			console.log(userdataRole);
			console.log(userdataCompany);
			const userdata = {
				role: userdataRole[0]?.role || null,
				company_id: userdataCompany[0]?.company_id || null,
			  };
			return res.status(200).json(userdata);
        } catch (error) {
            console.error('Ошибка во время создания event: ', error);
            return res.status(500).json({ message: 'Произошла ошибка во время создания eventa' });
        }
    } catch (error) {
        console.error('Ошибка во время создания eventa: ', error);
        return res.status(401).json({ message: 'Недействительный токен' });
    }
});

app.patch('/api/status/events/:eventId', async (req, res) => {
	const { eventId } = req.params;
  
	try {
		const [event, _] = await db.promise().query(`SELECT * FROM events WHERE event_id = ${eventId}`);
		
		if (!event[0]) {
			return res.status(404).json({ message: 'Событие не найдено' });
		}
		
		const locationOf = JSON.parse(event[0].locationOf);
		const timeZone = await getTimeZone(locationOf.lat, locationOf.lng);
		const localCurrentTime = moment().tz(timeZone);

		if (localCurrentTime.isAfter(event[0].event_end_date)) {
			return res.status(400).json({ message: 'Cannot change the status of a completed event' });
		}

		const newStatus = event[0].status === 'active' ? 'inactive' : 'active';
		
		await db.promise().query(`UPDATE events SET status = '${newStatus}' WHERE event_id = ${eventId}`);
		
		return res.status(200).json({ message: 'Статус события успешно изменен' });
	} catch (error) {
		console.error('Ошибка при изменении статуса события:', error);
		return res.status(500).json({ message: 'Произошла ошибка при изменении статуса события' });
	}
});

app.get('/api/admins/:userId', async (req, res) => {
	try{
		const { userId } = req.params;
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Токен не найден' });
		}
		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		try {
			const user = await findUser(`user_id = '${userId}'`);
			if (!user) {
				return res.status(404).json({ message: 'Пользователь не найден' });
			}
			
			
			if (user.role !== 'admin') {
				return res.status(403).json({ message: 'Недостаточно прав' });
			}

			return res.status(200).json(user);
		} catch (error) {
			console.error('Ошибка получения данных пользователя:', error);
			return res.status(500).json({ message: 'Произошла ошибка при получении данных пользователя' });
		}
	} catch(error) {
		console.error('Ошибка при получении данных пользователя:', error);
		return res.status(401).json({ message: 'Недействительный токен' });
	}
});

const updateUser = async (userId, fullName, login, email) => {
  await db.promise().query('UPDATE users SET full_name = ?, login = ?, email = ? WHERE user_id = ?', [fullName, login, email, userId]);
};

app.patch('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, email, login } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      	return res.status(404).json({ message: 'Токен не найден' });
    }

    const token = authHeader.split(' ')[1];
	const decoded = verifyToken(token);
    try {
		const user = await findUser(`user_id = '${userId}'`);
		if (!user) {
			return res.status(404).json({ message: 'Пользователь не найден' });
		}

		const jwtUserProfileToken = decoded.profileToken;
		if (user.profile_token !== jwtUserProfileToken && decoded.role !== 'admin') {
			return res.status(403).json({ message: 'Недостаточно прав для редактирования профиля' });
		}

		if (!email || !login) {
			return res.status(400).json({ message: 'Пожалуйста, предоставьте данные для обновления' });
		}

		await updateUser(userId, fullName, login, email);

		return res.status(200).json({ message: 'Данные пользователя успешно обновлены' });
    } catch (error) {
      	return res.status(500).json({ message: 'Произошла ошибка при обновлении данных пользователя' });
    }
  } catch (error) {
		console.error('Ошибка при обновлении данных пользователя:', error);
		return res.status(401).json({ message: 'Недействительный токен' });
  }
});

app.post('/api/users/edit', async (req, res) => {
	try {
		const {userId, profileToken} = req.body;
		const authHeader = req.headers.authorization;
		const token = authHeader.split(' ')[1];
		const user = await findUser(`user_id = '${userId}'`);
		const decoded = verifyToken(token);
		try {

			if (!user) {
				return res.status(404).json({ message: 'Пользователь не найден' });
			}
			const jwtUserProfileToken = decoded.profileToken;
			if (user.profile_token !== jwtUserProfileToken && decoded.role !== 'admin') {
				return res.status(403).json({ message: 'Недостаточно прав для редактирования профиля' });
			}
			return res.status(200).json({ message: 'Доступ разрешён' });
		} catch (error) {
			return res.status(500).json({message: 'Произошла ошибка при получении доступа к редактированию профиля'});
		}
	}  catch (error) {
		console.error('Ошибка при получении доступа к редактированию профиля:', error);
		return res.status(401).json({ message: 'Недействительный токен' });
	}
});

app.delete('/api/users/:userId', async (req, res) => {
	try {
	const userId = req.params.userId;
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(404).json({ message: 'Токен не найден' });
	}

	const token = authHeader.split(' ')[1];
	const user = await findUser(`user_id = '${userId}'`);
	const decoded = verifyToken(token);

	try {
		if (!user) {
			return res.status(404).json({ message: 'Пользователь не найден' });
		}
		const jwtUserProfileToken = decoded.profileToken;
		if (user.profile_token !== jwtUserProfileToken && decoded.role !== 'admin') {
			return res.status(403).json({message: 'Недостаточно прав.'});
		}

		const tempLogin = generateToken();
		const tempPassword = generateToken();
		const hashedPass = setHash(tempPassword); 
		const tempEmail = generateToken();

		updateUser(userId, "Deleted user", tempLogin, tempEmail);
		await db.promise().query('UPDATE users SET avatar = ? WHERE id = ?', [null, userId]);
		await db.promise().query('UPDATE users SET password = ? WHERE id = ?', [hashedPass, userId]);
		return res.status(200).json({ message: 'Пользователь успешно удалён' });
	} catch (error) {
		console.error('Ошибка при удалении пользователя:', error);
		return res.status(500).json({ message: 'Произошла ошибка при удалении данных о пользователе' });
	}
	} catch(error) {
		console.error('Ошибка при удалении пользователя:', error);
		return res.status(401).json({message: 'Недействительный токен'})
	}
});

app.patch('/api/users/update/avatar', uploadAvatar.single('avatar'), async (req, res) => {
	try {
		const authHeader = req.headers.authorization;
		const avatar = req.file;
		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		const userId = decoded.userId;
		const target = req.headers.target;

		try {
			const user = await findUser(`user_id = '${userId}'`);
			if (!user) {
				return res.status(404).json({ message: 'Пользователь не найден' });
			}

			if (target != user.user_id) {
				return res.status(403).json({ message: 'Недостаточно прав для редактирования профиля' });
			}

			if (!avatar) {
				return res.status(400).json({ message: 'Файл аватара не найден' });
			}
			const avatarPath = `uploads/${avatar.originalname}`;

			await db.promise().query('UPDATE users SET avatar = ? WHERE user_id = ?', [avatarPath, userId]);

			return res.status(200).json({ success: true });
		} catch(error) {
			console.error('Ошибка при обновлении данных пользователя:', error);
			return res.status(500).json({ message: 'Произошла ошибка при обновлении данных пользователя' });
		}
	} catch(error) {
		console.error('Ошибка при обновлении данных пользователя:', error);
		return res.status(401).json({ message: 'Недействительный токен' });
	}
});

app.get('/api/events', async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const perPage = parseInt(req.query.perPage) || 10;
	const offset = (page - 1) * perPage;
	
	const sortBy = req.query.sortBy || 'likes';
	const startDate = req.query.startDate || '';
	const endDate = req.query.endDate || '';
	const selectedStatus = req.query.selectedStatus || 'active';
  
  	try{
		let query;
		let queryValues = [];

		query = 'SELECT events.*, COUNT(likes.event_id) AS likes_count ' +
				'FROM events LEFT JOIN likes ON events.event_id = likes.event_id AND likes.type = ? ';
		queryValues.push('like');
		
		if (selectedStatus !== 'both') {
			query+='WHERE events.status = ? ';
			queryValues.push(selectedStatus);
			
			if (startDate !== '' && endDate !== '') {
				query += 'AND event_publish_date BETWEEN ? AND ? ';
				queryValues.push(startDate, endDate);
			}
		} else {
			if (startDate !== '' && endDate !== '') {
				query += 'WHERE event_publish_date BETWEEN ? AND ? ';
				queryValues.push(startDate, endDate);
			}
		}
		if (sortBy === 'likes') {
			query += 'GROUP BY events.event_id ORDER BY likes_count DESC';
		} else {
			query += 'GROUP BY events.event_id ORDER BY events.event_publish_date DESC';
		}
		
		query += ' LIMIT ? OFFSET ?';

		queryValues.push(perPage);
		queryValues.push(offset);
		
		const [events, _] = await db.promise().query(query, queryValues);
		res.status(200).json(events);
	}catch (error) {
		console.error('Ошибка во время получения списка публикаций: ', error);
		return res.status(500).json({ message: 'Произошла ошибка во время получения списка публикаций' });
	}
});

app.put('/api/companies/:companyId/confirm', async (req, res) => {
    const { companyId } = req.params;

	const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    try {
		const decoded = verifyToken(token);
        const isAdmin = decoded.role === 'admin';
        if (!isAdmin) {
            return res.status(403).json({ message: 'Forbidden: Only admin can access this resource' });
        }

        const [companyResult, _] = await db.promise().query('SELECT * FROM companies WHERE company_id = ?', [companyId]);
        const company = companyResult[0];
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        if (!company.email_confirmed) {
            return res.status(400).json({ message: 'Company email is not confirmed. Cannot approve.' });
        }

        await db.promise().query('UPDATE companies SET approved = TRUE WHERE company_id = ?', [companyId]);

        const [userResult, __] = await db.promise().query('SELECT email, full_name, login FROM users WHERE user_id = ?', [company.user_id]);
        const ownerEmail = userResult[0].email;

        const mailOptions = {
            from: 'uevent.propaganda@gmail.com',
            to: ownerEmail,
            subject: 'uevent: Company approval',
            html: `
			<div style="background-color: #f2f2f2; color: #333; padding: 20px; border-radius: 10px; width: 400px; margin: 0 auto;">
				<h1 style="text-align: center; margin-bottom: 20px;">Company Approval Notification</h1>
				<p style="text-align: center;">Dear <strong>${userResult[0].full_name !== null ? userResult[0].full_name : userResult[0].login}</strong>,</p>
				<p style="text-align: center;">Your company <strong>${company.company_name}</strong> has been successfully approved.</p>
				<p style="text-align: center;">Thank you for choosing us.</p><br>
				<p style="text-align: center;">Best regards,</p>
				<p style="text-align: center;">CD Team</p>
			</div>		
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Email not sent:', error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        return res.status(200).json({ message: 'Company approved successfully' });
    } catch (error) {
        console.error('Error while confirming company:', error);
        return res.status(500).json({ message: 'Error while confirming company' });
    }
});

app.put('/api/companies/:companyId/deny', async (req, res) => {
    const { companyId } = req.params;

	const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    try {
		const decoded = verifyToken(token);
        const isAdmin = decoded.role === 'admin';
        if (!isAdmin) {
            return res.status(403).json({ message: 'Forbidden: Only admin can access this resource' });
        }

        const [companyResult, _] = await db.promise().query('SELECT * FROM companies WHERE company_id = ?', [companyId]);
        const company = companyResult[0];
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        await db.promise().query('DELETE FROM companies WHERE company_id = ?', [companyId]);

        const [userResult, __] = await db.promise().query('SELECT email, full_name, login FROM users WHERE user_id = ?', [company.user_id]);
        const ownerEmail = userResult[0].email;

        const mailOptions = {
            from: 'uevent.propaganda@gmail.com',
            to: ownerEmail,
            subject: 'uevent: Company Rejection',
            html: `
			<div style="background-color: #f2f2f2; color: #333; padding: 20px; border-radius: 10px; width: 400px; margin: 0 auto;">
				<h1 style="text-align: center; margin-bottom: 20px;">Company Rejection Notification</h1>
				<p style="text-align: center;">Dear <strong>${userResult[0].full_name !== null ? userResult[0].full_name : userResult[0].login}</strong>,</p>
				<p style="text-align: center;">We regret to inform you that your company <strong>${company.company_name}</strong> has been denied approval.</p>
				<p style="text-align: center;">Please feel free to contact us for further information.</p><br>
				<p style="text-align: center;">Best regards,</p>
				<p style="text-align: center;">CD Team</p>
			</div>		
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Email not sent:', error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        return res.status(200).json({ message: 'Company denied successfully' });
    } catch (error) {
        console.error('Error while denying company:', error);
        return res.status(500).json({ message: 'Error while denying company' });
    }
});

app.get('/api/admin/companies', async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyToken(token);
        const isAdmin = decoded.role === 'admin';
        if (!isAdmin) {
            return res.status(403).json({ message: 'Forbidden: Only admin can access this resource' });
        }

        const [companies, _] = await db.promise().query('SELECT company_id, company_name, email, email_confirmed, locationOf, user_id, approved FROM companies ORDER BY approved DESC, company_id ASC');
        res.status(200).json(companies);
    } catch (error) {
        console.error('Error while fetching companies:', error);
        res.status(500).json({ message: 'Error while fetching companies' });
    }
});

app.get('/api/companies/confirm/:token', async (req, res) => {
	const { token } = req.params;
	try {
	  const [result, _] = await db.promise().query(`SELECT * FROM companies WHERE confirm_token = ?`, [token]);
	  if (result.length === 0) {
		return res.status(400).send({ message: 'Invalid token' });
	  }
  
	  const companyId = result[0].company_id;
	  await db.promise().query('UPDATE companies SET email_confirmed = TRUE, confirm_token = NULL WHERE company_id = ?', [companyId]);
  
	  return res.status(200).send({ message: 'Email successfully confirmed' });
	} catch (error) {
	  console.error('Error during email confirmation:', error);
	  res.status(500).json({ message: 'Error during email confirmation' });
	}
});
  

app.post('/api/companies', uploadPostFile.array('files'), async (req, res) => {
    const companyData = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(404).json({ message: 'Token not found' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        const authorId = decoded.userId;
        const profileToken = decoded.profileToken;
        const user = await findUser(`user_id = ${authorId}`);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        try {
            if (user.profile_token !== profileToken) {
                return res.status(403).json({ message: 'Insufficient rights to send the application' });
            }

			const existingCompany = await findCompany(`user_id = ${authorId}`);
			if (existingCompany) {
				if (existingCompany.approved) {
					return res.status(400).json({ message: 'User already has a registered company' });
				} else {
					return res.status(400).json({ message: "Please wait until your company's verification has been completed." });
				}
			}			

			const existingNameCompany = await findCompany(`company_name = '${companyData.companyName}'`);
			if (existingNameCompany) {
				return res.status(400).json({ message: 'Company name is already taken by another company' });
			}

			const existingEmailCompany = await findCompany(`email = '${companyData.companyEmail}'`);
			if (existingEmailCompany) {
				return res.status(400).json({ message: 'Email is already registered by another company' });
			}

			const confirmToken = generateToken();

			await db.promise().query(`
				INSERT INTO companies (company_name, email, locationOf, user_id, approved, confirm_token)
				VALUES ('${companyData.companyName}', '${companyData.companyEmail}', '${companyData.markerPosition}', ${authorId}, FALSE, '${confirmToken}')
			`);		  

			const mailOptions = {
				from: 'uevent.propaganda@gmail.com',
				to: companyData.companyEmail,
				subject: 'uevent: Company email confirmation',
				html: `
					<div style="background-color: #f2f2f2; color: #333; padding: 20px; border-radius: 10px; width: 400px; margin: 0 auto;">
						<h1 style="text-align: center; margin-bottom: 20px;">uevent: Company email confirmation</h1>
						<p style="text-align: center;">Click the button below to confirm your company email:</p>
						<div style="text-align: center;">
							<a href="http://localhost:3001/companyConfirm/${confirmToken}" style="display: inline-block; background-color: black; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;">Confirm</a>
						</div>
					</div>
				`
			};
			transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
					console.error('Email not sent:', error);
				} else {
					console.log('Email sent: ' + info.response);
				}
			});

            res.json({ message: 'Application successfully sent' });
        } catch (error) {
            console.error('Error while creating company:', error);
            return res.status(500).json({ message: 'Произошла ошибка во время создания eventa' });
        }
    } catch (error) {
        console.error('Error while creating company: ', error);
        return res.status(401).json({ message: 'Недействительный токен' });
    }
});

app.post('/api/events', uploadPostFile.array('files'), async (req, res) => {
    const eventData = req.body;
    const publishDate = new Date();
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(404).json({ message: 'Token not found' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        const authorId = decoded.userId;
        const profileToken = decoded.profileToken;
        const user = await findUser(`user_id = ${authorId}`);
        let start;
        let end;

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!eventData.startDate) {
            const eventDate = new Date(eventData.date);
            eventDate.setHours(0, 0, 0, 0);
            start = eventDate;
        } else {
            if (!eventData.endDate) {
				start = eventData.startDate;
			} else {
				start = eventData.startDate[0];
			}
        }

        if (!eventData.endDate) {
            const eventDate = new Date(eventData.date);
            eventDate.setHours(23, 59, 59, 99);
            end = eventDate;
        } else {
            end = eventData.endDate;
        }

        try {
            if (user.profile_token !== profileToken) {
                return res.status(403).json({ message: 'Недостаточно прав для создания event' });
            }

            const files = req.files;
			const filePaths = files.map(file => `${file.originalname}`);
			const [companyId] = await db.promise().query('SELECT company_id FROM companies WHERE user_id = ?', [authorId]);
			if (!companyId[0]) {
				const [event, _] = await db.promise().query(
					'INSERT INTO events (event_name, description, ticket_price, event_start_date, event_end_date, event_publish_date, number_of_tickets, banner,  locationOf, status, non_participant, notifications) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
					[eventData.title, eventData.content, eventData.ticketPrice, start, end, publishDate, eventData.numberTickets, filePaths.length > 0 ? filePaths : "-1714054050.jpg", eventData.markerPosition, 'active', eventData.non_participant, eventData.notifications ]
				);
			} else {
				const [event, _] = await db.promise().query(
					'INSERT INTO events (event_name, description, ticket_price, event_start_date, event_end_date, event_publish_date, number_of_tickets, banner,  locationOf, status, non_participant, notifications, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
					[eventData.title, eventData.content, eventData.ticketPrice, start, end, publishDate, eventData.numberTickets, eventData.filenames, eventData.markerPosition, 'active', eventData.non_participant, eventData.notifications, companyId[0].company_id ]
				);
			}
			const [formatId] = await db.promise().query('SELECT format_id FROM format WHERE format_name = ?', eventData.format);
            const [eventNew] = await db.promise().query('SELECT LAST_INSERT_ID() AS id');
            await db.promise().query('INSERT INTO eventformat (event_id, format_id) VALUES (?, ?)', [eventNew[0].id, formatId[0].format_id]);

			for (const topic of eventData.topics) {
				const [themeId] = await db.promise().query('SELECT theme_id FROM theme WHERE theme_name = ?', topic);
				await db.promise().query('INSERT INTO eventtheme (event_id, theme_id) VALUES (?, ?)', [eventNew[0].id, themeId[0].theme_id]);
			}
            await db.promise().query('INSERT INTO promocodes (event_id, promocode, sale, uses) VALUES (?, ?, ?, ?)', [eventNew[0].id, eventData.promo, eventData.sale, eventData.uses]);
            res.json({ message: 'Event успешно создан' });
        } catch (error) {
            console.error('Ошибка во время создания event: ', error);
            return res.status(500).json({ message: 'Произошла ошибка во время создания eventa' });
        }
    } catch (error) {
        console.error('Ошибка во время создания eventa: ', error);
        return res.status(401).json({ message: 'Недействительный токен' });
    }
});

app.patch('/api/events/:eventId', uploadPostFile.array('files'), async (req, res) => {
    const eventId = req.params.eventId;
    const eventData = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(404).json({ message: 'Token not found' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        const user = await findUser(`user_id = ${eventData.currentUserId}`);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        try {
            const [companyResult, __] = await db.promise().query(`SELECT * FROM companies WHERE user_id = ${user.user_id} AND approved = TRUE`);
			const hasCompany = companyResult.length > 0;

			const userData = {
				user,
				hasCompany
			};
			if(user.role === 'admin' || hasCompany.company_id === eventData.company_id) {
				const files = req.files;
				const filePaths = files.map(file => `${file.originalname}`);
				await db.promise().query(
					'UPDATE events SET event_name = ?, description = ?, ticket_price = ?, number_of_tickets = ?, banner = ? WHERE event_id = ?',
					[eventData.event_name, eventData.description, eventData.ticket_price, eventData.number_of_tickets, filePaths.length > 0 ? filePaths : "-1714054050.jpg", eventId]
				);
				const formates = req.body.formats.split(',').map(format => Number(format));
				await db.promise().query('DELETE FROM eventformat WHERE event_id = ?', [eventId])
		
				for (const format of formates) {
					if(format !== 0){
						await db.promise().query(
							'INSERT INTO eventformat (event_id, format_id) VALUES (?, ?)',
							[eventId, format]
						);
					}
				}
				const themes = req.body.themes.split(',').map(theme => Number(theme));
				await db.promise().query('DELETE FROM eventtheme WHERE event_id = ?', [eventId])
		
				for (const theme of themes) {
					if(theme !== 0){
						await db.promise().query(
							'INSERT INTO eventtheme (event_id, theme_id) VALUES (?, ?)',
							[eventId, theme]
						);
					}
				}
				res.status(200).json({ message: 'Event успешно обновлен' });
			}
			else {
				res.status(403).json({ message: 'Недостаточно прав' });
			}
			
			
        } catch (error) {
            console.error('Ошибка во время обновления event: ', error);
            return res.status(500).json({ message: 'Произошла ошибка во время обновления event' });
        }
    } catch(error) {
        console.error('Ошибка во время обновления event: ', error);
        return res.status(401).json({ message: 'Недействительный токен' });
    }
});

app.get('/api/files/:file', (req, res) => {
  const { file } = req.params;
  const filePath = path.resolve(process.cwd(), 'post_files', file);
  res.sendFile(filePath);
});

app.get('/api/event/:postId/files', async (req, res) => {
	const { postId } = req.params;
	try {
		const [files, _] = await db.promise().query('SELECT banner FROM events WHERE event_id = ?',
			[postId]
		);
		res.status(200).json(files);
		
	} catch (error) {
		console.error('Ошибка во время получения файлов публикации: ', error);
		return res.status(500).json({message: 'Произошла ошибка во время получения файлов публикации'});
	}
});

app.get('/api/topics', async (req, res) => {
	try {
		const [topics, _] = await db.promise().query('SELECT * FROM theme');
		res.status(200).json(topics);
	} catch (error) {
		console.error('Error during topics data getting: ', error);
		return res.status(500).json({message: 'Error during topics data getting'});
	}
});

app.get('/api/formats', async (req, res) => {
	try {
		const [formats, _] = await db.promise().query('SELECT * FROM format');
		res.status(200).json(formats);
	} catch (error) {
		console.error('Error during formats data getting: ', error);
		return res.status(500).json({message: 'Error during formats data getting'});
	}
});

app.get('/api/:postId/formats', async (req, res) => {
    const postId = req.params.postId;

    try {
        const [formats, _] = await db.promise().query(
            'SELECT f.* FROM format f JOIN eventformat ef ON f.format_id = ef.format_id WHERE ef.event_id = ?',
            [postId]
        );

        res.json(formats);
    } catch (error) {
        console.error('Error fetching formats: ', error);
        return res.status(500).json({ message: 'An error occurred while fetching formats' });
    }
});

app.get('/api/:postId/topics', async (req, res) => {
    const postId = req.params.postId;

    try {
        const [topics, _] = await db.promise().query(
            'SELECT t.* FROM theme t JOIN eventtheme et ON t.theme_id = et.theme_id WHERE et.event_id = ?',
            [postId]
        );

        res.json(topics);
    } catch (error) {
        console.error('Error fetching topics: ', error);
        return res.status(500).json({ message: 'An error occurred while fetching topics' });
    }
});

app.post('/api/events/:eventId/comments', async (req, res) => {
	const { eventId } = req.params;
	const { parentId, content } = req.body;
	const authHeader = req.headers.authorization;
	
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(404).json({ message: 'Токен не найден' });
	}
	try {
	  const token = authHeader.split(' ')[1];
	  const decoded = verifyToken(token);
	  const authorId = decoded.userId;
	  const profileToken = decoded.profileToken;
	  const publishDate = new Date();
  
	try {
	  const [comment] = await db.promise().query(
		'INSERT INTO comments (user_id, event_id, content, publish_date) VALUES (?, ?, ?, ?)',
		[authorId, eventId, content, publishDate]
	  );
	  const newCommentId = comment.insertId;
	  const [newComment] = await db.promise().query('SELECT * FROM comments WHERE comment_id = ?', [newCommentId]);
	  res.status(201).json(newComment[0]);
	} catch (error) {
	  console.error('Ошибка при добавлении комментария:', error);
	  res.status(500).json({ message: 'Произошла ошибка при добавлении коментария.' });
	}
	} catch(error){
	  console.error('Ошибка при добавлении комментария:', error);
	  res.status(401).json({ message: 'Недействительный токен.' });
	}
});

app.get('/api/events/:eventId', async (req, res) => {
	const eventId = req.params.eventId;
	
	try {
		const [event, _] = await db.promise().query('SELECT * FROM events WHERE event_id = ?',
			[eventId]
		);
		res.status(200).json(event[0]);
	} catch (error) {
		console.error('Ошибка во время получения данных мероприятия: ', error);
		return res.status(500).json({message: 'Произошла ошибка во время получения данных мероприятия'});
	}
});

async function getTimeZone(lat, lng) {
    try {
        const timeZone = tzlookup(lat, lng);
        return timeZone;
    } catch (error) {
        console.error('Ошибка при получении временной зоны: ', error);
        return null;
    }
}

async function sendEmailNotification(user, event) {
    const eventStartDateFormatted = moment(event.event_start_date).format('ddd MMM DD YYYY HH:mm');

	const mailOptions = {
		from: 'uevent.propaganda@gmail.com',
		to: user.email,
		subject: 'Upcoming Event Notification',
		html: `
			<div style="background-color: #f2f2f2; color: #333; padding: 20px; border-radius: 10px; width: 400px; margin: 0 auto;">
				<h2 style="text-align: center; margin-bottom: 20px;">Upcoming Event Notification</h2>
				<p style="text-align: center;">Hello ${user.login},</p>
				<p style="text-align: center;">Tomorrow, at <strong>${eventStartDateFormatted}</strong>, you have a ticket purchased for the event <strong>${event.event_name}</strong>.</p>
				<p style="text-align: center;">Have a good time!</p>
			</div>
		`
	};

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Email not sent:', error);
        }
    });
}

async function updateEventsStatus() {
	try {
		const [rows, _] = await db.promise().query('SELECT * FROM events WHERE status = "active"');
	
		for (const row of rows) {
			const locationOf = JSON.parse(row.locationOf);
			const timeZone = await getTimeZone(locationOf.lat, locationOf.lng);
			const localCurrentTime = moment.tz(timeZone);

			if (localCurrentTime.isAfter(moment.tz(row.event_end_date, timeZone))) {
				await db.promise().query('UPDATE events SET status = "inactive" WHERE event_id = ?', [row.event_id]);
			}

            const eventStartDate = moment.tz(row.event_start_date, timeZone);
            const localCurrentDatePlusOneDay = localCurrentTime.clone().add(1, 'day');

			const sameYear = localCurrentDatePlusOneDay.year() === eventStartDate.year();
            const sameMonth = localCurrentDatePlusOneDay.month() === eventStartDate.month();
            const sameDay = localCurrentDatePlusOneDay.date() === eventStartDate.date();
            const sameHour = localCurrentDatePlusOneDay.hour() === eventStartDate.hour();
            const sameMinute = localCurrentDatePlusOneDay.minute() === eventStartDate.minute();

            if (sameYear && sameMonth && sameDay && sameHour && sameMinute) {
				const [uniqueUserIds, __] = await db.promise().query('SELECT DISTINCT user_id FROM tickets WHERE event_id = ?', [row.event_id]);

				for (const { user_id } of uniqueUserIds) {
					const [user, ___] = await db.promise().query('SELECT * FROM users WHERE user_id = ?', [user_id]);
					sendEmailNotification(user[0], row);
				}
			}
		}
	} catch (error) {
	  console.error('Ошибка при обновлении статуса мероприятий: ', error);
	}
} 

setInterval(updateEventsStatus, 60000);

app.get('/api/events/:eventId/comments', async (req, res) => {
	const { eventId } = req.params;
	const page = parseInt(req.query.page) || 1;
	const perPage = parseInt(req.query.perPage) || 5;
	const offset = (page - 1) * perPage;
	const authHeader = req.headers.authorization;
	
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		try {
			const [comments, _] = await db.promise().query(`SELECT * FROM comments WHERE event_id = ? ORDER BY comment_id DESC LIMIT ? OFFSET ?`, [eventId, perPage, offset]);
			res.status(200).json(comments);
		} catch (error) {
			console.error('Ошибка при получении комментариев:', error);
			res.status(500).json({ message: 'Произошла ошибка при получении комментариев' });
		}
	} else {
	try{
		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		const authorId = decoded.userId;
		const profileToken = decoded.profileToken;
		const user = await findUser(`user_id = ${authorId}`);
		if (!user) {
			return res.status(404).json({ message: 'Пользователь не найден' });
		}
		if(user.role !== 'admin'){
			const [comments, _] = await db.promise().query(`(SELECT * FROM comments WHERE event_id = ?) UNION (SELECT * FROM comments WHERE user_id = ? AND event_id = ?) ORDER BY comment_id DESC LIMIT ? OFFSET ?`, [eventId, authorId, eventId, perPage, offset]);
			res.status(200).json(comments);
		} else {
			const [comments, _] = await db.promise().query(`SELECT * FROM comments WHERE event_id = ? ORDER BY comment_id DESC LIMIT ? OFFSET ?`, [eventId, perPage, offset]);
			res.status(200).json(comments);
		}
	} catch(error){
		const [comments, _] = await db.promise().query(`SELECT * FROM comments WHERE event_id = ? ORDER BY comment_id DESC LIMIT ? OFFSET ?`, [eventId, perPage, offset]);
		res.status(200).json(comments);
	}
	}
});

app.get('/api/comments/:commentId', async (req, res) => {
	const { commentId } = req.params;
  
	try {
		const [comments] = await db.promise().query('SELECT * FROM comments WHERE comment_id = ?', [commentId]);
	  	res.status(200).json(comments);
	} catch (error) {
		console.error('Ошибка при получении комментария:', error);
		res.status(500).json({ message: 'Произошла ошибка при получении комментария' });
	}
});

app.patch('/api/users/:userId/preferences', async (req, res) => {
	try {
		const { userId } = req.params;
		const authHeader = req.headers.authorization;
		const eventId = req.headers['event-id'];
		const { showUserName } = req.body;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Токен не найден' });
		}

		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		try {
			const userIdNow = decoded.userId;
			if (userId != userIdNow) {
			   return res.status(403).json({message: 'Недостаточно прав'});
			}
			if(showUserName === false){
				await db.promise().query('UPDATE tickets SET showName = ? WHERE event_id = ? AND user_id = ?', [0, eventId, userId]);
			} else {
				await db.promise().query('UPDATE tickets SET showName = ? WHERE event_id = ? AND user_id = ?', [1, eventId, userId]);
			}
			res.status(200).json({ message: 'Name show updated' });
		} catch (error) {
			console.error('Error during updating show user name:', error);
			res.status(500).json({ message: 'Error during updating show user name:' });
		}
	} catch(error) {
		console.error('Ошибка при изменении статуса публикации:', error);
		res.status(401).json({ message: 'Недействительный токен.' });
	}
});

app.patch('/api/comments/:commentId', async (req, res) => {
	try {
		const { commentId } = req.params;
		const { content } = req.body;
		const authHeader = req.headers.authorization;
	
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Токен не найден' });
		}
	
		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
	
		try {
			const jwtUserProfileToken = decoded.profileToken;
			const userId = decoded.userId;
		
			const user = await findUser(`user_id = ${userId}`);
			if (!user) {
				return res.status(404).json({ message: 'Пользователь не найден' });
			}
		
			if (user.profile_token !== jwtUserProfileToken) {
				return res.status(403).json({ message: 'Недостаточно прав' });
			}
		
			await db.promise().query('UPDATE comments SET content = ? WHERE comment_id = ?', [content, commentId]);
			res.status(200).json({message: 'Комментарий успешно обновлен'});
		} catch (error) {
			console.error('Ошибка при обновлении комментария:', error);
			res.status(500).json({ message: 'Произошла ошибка при обновлении комментария' });
		}
	}catch(error) {
		console.error('Ошибка при добавлении комментария:', error);
		res.status(401).json({ message: 'Недействительный токен.' });
	}
});

app.delete('/api/comments/:commentId', async (req, res) => {
	try {
		const { commentId } = req.params;
		const authHeader = req.headers.authorization;
		
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Токен не найден' });
		}

		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		try {
			const jwtUserProfileToken = decoded.profileToken;
			const userId = decoded.userId;

			const hasAccess = await checkUserAccessAdminComment(userId, commentId, res);
			if (!hasAccess) {
			  return res.status(403).json({message: 'Недостаточно прав'});
			}
			
			await db.promise().query('DELETE FROM likes WHERE comment_id = ?', [commentId]);
			await db.promise().query('DELETE FROM comments WHERE comment_id = ?', [commentId]);
			res.status(200).json({ message: 'Комментарий удалён' });
		} catch (error) {
			console.error('Ошибка при удалении комментария:', error);
			res.status(500).json({ message: 'Произошла ошибка при удалении комментария' });
		}
	}catch(error) {
		console.error('Ошибка при удалении комментария:', error);
		res.status(401).json({ message: 'Недействительный токен.' });
	}
});

app.get('/api/search/users', async (req, res) => {
	try {
		const searchTerm = req.query.search;

		if(searchTerm == null || searchTerm == '') {
			return res.status(404).json({message: 'User not found'});
		}
		const [usersResult] = await db.promise().query('SELECT user_id, login, full_name, email, avatar FROM users WHERE login LIKE ?',[`%${searchTerm}%`]);

		const filteredUsers = usersResult.filter(user => user.full_name !== 'Deleted user');

		return res.status(200).json({ list: filteredUsers });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: 'Failed to fetch searched user' });
	}
});

app.get('/api/search/events', async (req, res) => {
	try {
	  const searchTerm = req.query.search;
  
	  if (!searchTerm || searchTerm.trim() === '') {
		return res.status(404).json({ message: 'Event not found' });
	  }
  
	  const [eventsResult] = await db.promise().query(`
		SELECT event_id, event_name, description, banner
		FROM events
		WHERE event_name LIKE ?
	  `, [`%${searchTerm}%`]);
  
	  return res.status(200).json({ list: eventsResult });
	} catch (error) {
	  console.error(error);
	  return res.status(500).json({ message: 'Failed to fetch searched events' });
	}
});  

app.get('/api/like/events/:eventId', async (req, res) => {
	try {
		const { eventId } = req.params;

		const likes = await db.promise().query(`SELECT * FROM likes WHERE type = ? AND event_id = ?`, ['like', eventId]);
		const dislikes = await db.promise().query(`SELECT * FROM likes WHERE type = ? AND event_id = ?`, ['dislike', eventId]);
		
		res.status(200).json({likes: likes[0], dislikes: dislikes[0]});
		
	}catch (error) {
		console.error('Ошибка получения реакций:', error);
		res.status(500).json({ error: 'Ошибка получения реакций' });
	}
});
 
app.post('/api/like/events/:eventId', async (req, res) => {
	try {
		const { eventId } = req.params;
		const { type } = req.body;
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Токен не найден' });
		}

		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);

		try {
			const jwtUserProfileToken = decoded.profileToken;
			const userId = decoded.userId;

			const user = await findUser(`user_id = ${userId}`);
			if (!user) {
				return res.status(404).json({ message: 'Пользователь не найден' });
			}

			if (user.profile_token !== jwtUserProfileToken) {
				return res.status(403).json({ message: 'Недостаточно прав' });
			}

			const [existingLikes] = await db.promise().query(
				'SELECT * FROM likes WHERE event_id = ? AND user_id = ?',
				[eventId, userId]
			);

			if (existingLikes.length > 0) {
				const existingType = existingLikes[0].type;

				if (existingType !== type) {
					await db.promise().query(
						'UPDATE likes SET type = ? WHERE event_id = ? AND user_id = ?',
						[type, eventId, userId]
					);
				}
			} else {
				await db.promise().query(
					'INSERT INTO likes (user_id, date, event_id, type) VALUES (?, NOW(), ?, ?)',
					[userId, eventId, type]
				);
			}

			return res.status(200).json({ message: 'Реакция успешно обновлена' });
		} catch (error) {
			console.error('Ошибка сохранения реакции:', error);
			return res.status(500).json({ error: 'Ошибка сохранения реакции' });
		}
	} catch (error) {
		console.error('Ошибка сохранения реакции:', error);
		return res.status(401).json({ message: 'Недействительный токен' });
	}
});

app.delete('/api/like/events/:eventId', async (req, res) => {  
	try {
		const { eventId } = req.params;
		const authHeader = req.headers.authorization;
		
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Токен не найден' });
		}
		
		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		try {
			const jwtUserProfileToken = decoded.profileToken;
			const userId = decoded.userId;
			
			const user = await findUser(`user_id = ${userId}`);
			if (!user) {
				return res.status(404).json({ message: 'Пользователь не найден' });
			}

			if (user.profile_token !== jwtUserProfileToken) {
				return res.status(403).json({ message: 'Недостаточно прав' });
			
			}
			await db.promise().query('DELETE FROM likes WHERE event_id = ? AND user_id = ?', [eventId, userId])

			res.status(200).json({ message: 'Лайк успешно убран' });
		} catch (error) {
			console.error('Ошибка удаления лайка:', error);
			res.status(500).json({ error: 'Ошибка удаления лайка' });
		}
	} catch (error) {
		console.error('Ошибка удаления лайка:', error);
		return res.status(401).json({ message: 'Недействительный токен' });
	}
});

app.get('/api/like/comments/:commentId', async (req, res) => {
	try {
		const { commentId } = req.params;

		const likes = await db.promise().query(`SELECT * FROM likes WHERE type = ? AND comment_id = ?`, ['like', commentId]);
		const dislikes = await db.promise().query(`SELECT * FROM likes WHERE type = ? AND comment_id = ?`, ['dislike', commentId]);
		
		res.status(200).json({likes: likes[0], dislikes: dislikes[0]});
		
	}catch (error) {
		console.error('Ошибка получения реакций:', error);
		res.status(500).json({ error: 'Ошибка получения реакций' });
	}
});

app.post('/api/like/comments/:commentId', async (req, res) => {
	try {
	  const { commentId } = req.params;
	  const { type } = req.body;
	  const authHeader = req.headers.authorization;
  
	  if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(404).json({ message: 'Токен не найден' });
	  }
  
	  const token = authHeader.split(' ')[1];
	  const decoded = verifyToken(token);
  
	  	try {
			const jwtUserProfileToken = decoded.profileToken;
			const userId = decoded.userId;
	
			const user = await findUser(`user_id = ${userId}`);
			if (!user) {
				return res.status(404).json({ message: 'Пользователь не найден' });
			}
	
			if (user.profile_token !== jwtUserProfileToken) {
				return res.status(403).json({ message: 'Недостаточно прав' });
			}
	
			const [existingLikes] = await db.promise().query(
				'SELECT * FROM likes WHERE comment_id = ? AND user_id = ?',
				[commentId, userId]
			);
	
			if (existingLikes.length > 0) {
				const existingType = existingLikes[0].type;
		
				if (existingType !== type) {
					await db.promise().query(
					'UPDATE likes SET type = ? WHERE comment_id = ? AND user_id = ?',
					[type, commentId, userId]
					);
				}
			} else {
				await db.promise().query(
					'INSERT INTO likes (user_id, date, comment_id, type) VALUES (?, NOW(), ?, ?)',
					[userId, commentId, type]
				);
			}
	
			return res.status(200).json({ message: 'Реакция успешно обновлена' });
		} catch (error) {
			console.error('Ошибка сохранения реакции:', error);
			return res.status(500).json({ error: 'Ошибка сохранения реакции' });
		}
	} catch (error) {
	  console.error('Ошибка сохранения реакции:', error);
	  return res.status(401).json({ message: 'Недействительный токен' });
	}
});

app.delete('/api/like/comments/:commentId', async (req, res) => {  
	try {
		const { commentId } = req.params;
		const authHeader = req.headers.authorization;
		
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Токен не найден' });
		}
		
		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		try {
			const jwtUserProfileToken = decoded.profileToken;
			const userId = decoded.userId;
			
			const user = await findUser(`user_id = ${userId}`);
			if (!user) {
				return res.status(404).json({ message: 'Пользователь не найден' });
			}

			if (user.profile_token !== jwtUserProfileToken) {
				return res.status(403).json({ message: 'Недостаточно прав' });
			
			}
			await db.promise().query('DELETE FROM likes WHERE comment_id = ? AND user_id = ?', [commentId, userId])

			res.status(200).json({ message: 'Лайк успешно убран' });
		} catch (error) {
			console.error('Ошибка удаления лайка:', error);
			res.status(500).json({ error: 'Ошибка удаления лайка' });
		}
	} catch (error) {
		console.error('Ошибка удаления лайка:', error);
		return res.status(401).json({ message: 'Недействительный токен' });
	}
});

app.post('/api/payment', async (req, res) => {
	const { cardNumber, cardExpiry, cardCVC, cardholderName, amount, eventId, promo, showName } = req.body;
	const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(404).json({ message: 'Токен не найден' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        const userId = decoded.userId;
        const user = await findUser(`user_id = ${userId}`);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const [[{ email: userEmail }]] = await db.promise().query('SELECT email FROM users WHERE user_id = ?', [userId]);

        const [[{ event_start_date: eventStartDate, notifications, company_id }]] = await db.promise().query('SELECT event_start_date, notifications, company_id FROM events WHERE event_id = ?', [eventId]);
        const currentDate = new Date();
        if (new Date(eventStartDate) < currentDate) {
            return res.status(400).json({ message: 'The event has already begun' });
        }

        const [[{ number_of_tickets: availableTickets }]] = await db.promise().query('SELECT number_of_tickets FROM events WHERE event_id = ?', [eventId]);
        if (availableTickets <= 0) {
            return res.status(400).json({ message: 'There are no tickets available' });
        }
        await db.promise().query('INSERT INTO tickets (user_id, event_id, showName) VALUES (?, ?, ?)', [userId, eventId, !showName]);
        await db.promise().query('UPDATE events SET number_of_tickets = number_of_tickets - 1 WHERE event_id = ?', [eventId]);

        const [lastTicket] = await db.promise().query('SELECT ticket_id FROM tickets ORDER BY ticket_id DESC LIMIT 1');
        const lastTicketId = lastTicket[0].ticket_id;
        const [eventRow] = await db.promise().query('SELECT event_name, ticket_price, event_start_date, company_id FROM events WHERE event_id = ?', [eventId]);
		const [promoRow] = await db.promise().query('SELECT * FROM promocodes WHERE event_id = ?', [eventId]);
		const event = eventRow[0];
        const hiddenCardNumber = '************' + cardNumber.slice(-4);
        let price = event.ticket_price;
        if(promo == promoRow[0].promocode) {
			price = price - promoRow[0].sale;
			const usesCount = promoRow[0].uses - 1;
			await db.promise().query('UPDATE promocodes SET uses = ? WHERE event_id = ?', [usesCount, eventId]);
		}

        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream(pdfPath));

        const textStyle = {
            fontSize: 12,
            margin: 10
        };

        const headerStyle = {
            fontSize: 16,
            margin: 20,
            align: 'center'
        };

        doc.font('Helvetica-Bold').text('Purchase Receipt', headerStyle);
        doc.moveDown();

        doc.font('Helvetica').text(`Event Name: ${event.event_name}`, textStyle);
        doc.font('Helvetica').text(`Event ID: ${eventId}`, textStyle);
        doc.font('Helvetica').text(`Card Number: ${hiddenCardNumber}`, textStyle);
        doc.font('Helvetica').text(`Amount: ${price} UAH`, textStyle);
        doc.font('Helvetica').text(`Payment ID: ${lastTicketId}`, textStyle);

        doc.end();

        const mailOptions = {
            from: 'uevent.propaganda@gmail.com',
            to: userEmail,
            subject: 'uevent: Thank you for your purchase',
            html: `
                <div style="background-color: #f2f2f2; color: #333; padding: 20px; border-radius: 10px; width: 400px; margin: 0 auto;">
                    <h2 style="text-align: center; margin-bottom: 20px;">Thank you for your purchase!</h2>
                    <div style="background-color: #fff; border: 1px solid #ccc; padding: 10px; border-radius: 10px; margin-bottom: 10px;">
                        <p><strong>Event:</strong> ${event.event_name}</p>
                        <p><strong>Payment ID:</strong> ${lastTicketId}</p>
                        <p><strong>Event ID:</strong> ${eventId}</p>
                        <p><strong>Card Number:</strong> ${hiddenCardNumber}</p>
                        <p><strong>Amount:</strong> ${price}₴</p>
                    </div>
                    <p style="text-align: center;">Enjoy the event!</p>
                    <p style="text-align: center;">Best regards,</p>
                    <p style="text-align: center;">CD Team</p>
                </div>
            `,
            attachments: [
                { filename: 'purchase_receipt.pdf', path: pdfPath }
            ]
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Email not sent:', error);
                return res.status(500).json({ error: 'Email sending error' });
            } else {
                console.log('Email sent: ' + info.response);
                res.status(200).json({ message: 'Payment successfully processed' });
            }
        });

        if (notifications) {
            const [[{ company_name: companyName, email: companyEmail }]] = await db.promise().query('SELECT company_name, email FROM companies WHERE company_id = ?', [company_id]);
            transporter.sendMail({
                from: 'uevent.propaganda@gmail.com',
                to: companyEmail,
                subject: `New Registration for Event: ${event.event_name}`,
                html: `
					<div style="background-color: #f2f2f2; color: #333; padding: 20px; border-radius: 10px; width: 400px; margin: 0 auto;">
						<h2 style="text-align: center; margin-bottom: 20px;">New Purchase Notification</h2>
						<p style="text-align: center;">Hello <strong>${companyName}</strong>,</p>
						<p style="text-align: center;">Someone just purchased a ticket for your event: <strong>${event.event_name}</strong>.</p>
					</div>
				`
            }, (error, info) => {
                if (error) {
                    console.error('Company notification email not sent:', error);
                } else {
                    console.log('Company notification email sent:', info.response);
                }
            });
        }
    } catch (error) {
        console.error('Ошибка сохранения билета:', error);
        return res.status(401).json({ error: 'Ошибка сохранения билета' });
    }
});

function encrypt(text, encryptKey) {
    const cipher = crypto.createCipher('aes-256-cbc', encryptKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function decrypt(encryptedText, encryptKey) {
    const decipher = crypto.createDecipher('aes-256-cbc', encryptKey);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

app.get('/api/2fa/create/:userId', async (req, res) => {
	try {
		const { userId } = req.params;
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Token not found' });
		}

    	const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		const tokenUserId = decoded.userId;
		if (parseInt(tokenUserId) !== parseInt(userId)) {
			return res.status(403).json({ message: 'Forbidden' });
		}

		const user = await findUser(`user_id = ${userId}`);
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		if (user['2fa_active']) {
			return res.status(400).json({ message: 'Two-factor authentication is already active' });
		}

        const secret = speakeasy.generateSecret({
            name: `uevent: ${user.login}`
        });

        const encryptedSecret = encrypt(secret.hex, user.password);

        qrcode.toDataURL(secret.otpauth_url)
            .then(finalQr => {
                res.status(200).json({ qrCodeUrl: finalQr });
            })
            .catch(error => {
                console.error('Error during QR code generation:', error);
                res.status(500).json({ error: 'Error during QR code generation' });
            });

        await db.promise().query('UPDATE users SET 2fa_key = ? WHERE user_id = ?', [encryptedSecret, userId]);
	}catch (error) {
		console.error('Error during creating qr:', error);
		res.status(500).json({ error: 'Error during creating qr' });
	}
});

app.post('/api/2fa/activate/:userId', async (req, res) => {
	try {
		const { userId } = req.params;
		const authHeader = req.headers.authorization;
	
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Token not found' });
		}
	
		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		const tokenUserId = decoded.userId;
		if (parseInt(tokenUserId) !== parseInt(userId)) {
			return res.status(403).json({ message: 'Forbidden' });
		}
	
		const user = await findUser(`user_id = ${userId}`);
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}
	
		if (user['2fa_active']) {
			return res.status(400).json({ message: 'Two-factor authentication is already active' });
		}

        const secretKey = decrypt(user['2fa_key'], user.password);

        const verified = speakeasy.totp.verify({
            secret: secretKey,
            encoding: 'hex',
            token: req.body.token
        });
	
		if (verified) {
			await db.promise().query('UPDATE users SET 2fa_active = true WHERE user_id = ?', [userId]);
	
			return res.status(200).json({ message: 'Two-factor authentication successfully activated' });
		} else {
			return res.status(400).json({ message: 'Invalid one-time password' });
		}
	} catch (error) {
		console.error('Error during activating 2FA:', error);
		return res.status(500).json({ error: 'Error during activating 2FA' });
	}
});  

app.listen(PORT, () => {
	console.log(`API is running on port ${PORT}`);
});