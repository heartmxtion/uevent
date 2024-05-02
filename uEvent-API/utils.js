import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js'

export const setHash = (password) => {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(Math.floor(Math.random() * (10 - 1 + 1)) + 1));
};

export function generateToken() {
	return uuidv4();
}

export async function findUser(value) {
	const [result, _] = await db.promise().query(`SELECT * FROM users WHERE ${value}`);
	try {
		const user = {
			user_id: result[0].user_id,
			login: result[0].login,
			password: result[0].password,
			full_name: result[0].full_name,
			email: result[0].email,
			avatar: result[0].avatar,
			role: result[0].role,
			confirmed: result[0].confirmed,
			'2fa_active': result[0]['2fa_active'],
			'2fa_key': result[0]['2fa_key'],
		};
		return user;
	} catch (err) {
		console.error('User is not exist');
		return null;
	}
}

export async function findCompany(value) {
    try {
        const [rows, _] = await db.promise().query(`SELECT * FROM companies WHERE ${value}`);
        if (rows.length > 0) {
            const company = {
                company_id: rows[0].company_id,
                company_name: rows[0].company_name,
                email: rows[0].email,
                locationOf: rows[0].locationOf,
                user_id: rows[0].user_id,
                approved: rows[0].approved
            };
            return company;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error while finding company:', error);
        throw error;
    }
}

export async function saveUser(login, email, password) {
	const [dataUser, _] = await db.promise().query(
		'INSERT INTO users (login, email, password) VALUES (?, ?, ?)',
		[login, email, password]
	);
	const user = {
		user_id: dataUser.insertId,
		login: login,
		email: email,
		password: password
	};
	return user;
}