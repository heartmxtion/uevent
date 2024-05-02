USE uevent;

CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    login VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar VARCHAR(255), 
    role ENUM('user', 'admin') DEFAULT 'user',
    confirmed BOOLEAN DEFAULT FALSE,
    confirm_token VARCHAR(255),
    2fa_active BOOLEAN DEFAULT FALSE,
    2fa_key VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS companies (
    company_id INT AUTO_INCREMENT,
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    email_confirmed BOOLEAN DEFAULT FALSE,
    confirm_token VARCHAR(255),
    locationOf VARCHAR(255) NOT NULL,
    user_id INT,
    approved BOOLEAN DEFAULT FALSE,
    PRIMARY KEY(company_id),
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS events (
    event_id INT AUTO_INCREMENT,
    event_name VARCHAR(255) NOT NULL,
    description TEXT,
    ticket_price INT NOT NULL DEFAULT 0,
    event_start_date TIMESTAMP NOT NULL,
    event_end_date TIMESTAMP NOT NULL,
    event_publish_date TIMESTAMP NOT NULL,
    number_of_tickets INT NOT NULL DEFAULT 100,
    banner VARCHAR(255),
    company_id INT,
    notifications BOOLEAN DEFAULT FALSE,
    non_participant BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'inactive'),
    locationOf VARCHAR(255) NOT NULL,
    PRIMARY KEY(event_id),
    FOREIGN KEY(company_id) REFERENCES companies(company_id)
);

CREATE TABLE IF NOT EXISTS format (
    format_id INT AUTO_INCREMENT,
    format_name VARCHAR(255) NOT NULL,
    PRIMARY KEY(format_id)
);

CREATE TABLE IF NOT EXISTS theme (
    theme_id INT AUTO_INCREMENT,
    theme_name VARCHAR(255) NOT NULL,
    PRIMARY KEY(theme_id)
);

CREATE TABLE IF NOT EXISTS eventformat (
    event_id INT,
    format_id INT,
    FOREIGN KEY(event_id) REFERENCES events(event_id),
    FOREIGN KEY(format_id) REFERENCES format(format_id)
);

CREATE TABLE IF NOT EXISTS eventtheme (
    event_id INT,
    theme_id INT,
    FOREIGN KEY(event_id) REFERENCES events(event_id),
    FOREIGN KEY(theme_id) REFERENCES theme(theme_id)
);

CREATE TABLE IF NOT EXISTS tickets (
    ticket_id INT AUTO_INCREMENT,
    user_id INT,
    event_id INT,
    showName BOOLEAN DEFAULT TRUE,
    PRIMARY KEY(ticket_id),
    FOREIGN KEY(user_id) REFERENCES users(user_id),
    FOREIGN KEY(event_id) REFERENCES events(event_id)
);

CREATE TABLE IF NOT EXISTS comments (
    comment_id INT AUTO_INCREMENT,
    user_id INT,
    event_id INT,
    content TEXT NOT NULL,
    publish_date DATETIME,
    PRIMARY KEY(comment_id),
    FOREIGN KEY(user_id) REFERENCES users(user_id),
    FOREIGN KEY(event_id) REFERENCES events(event_id)
);

CREATE TABLE IF NOT EXISTS likes (
    like_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    date DATETIME,
    event_id INT,
    comment_id INT,
    type ENUM('like', 'dislike'),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (comment_id) REFERENCES comments(comment_id)
);

CREATE TABLE IF NOT EXISTS promocodes (
  promocode_id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  promocode VARCHAR(255) NOT NULL,
  uses INT NOT NULL DEFAULT 0,
  sale DECIMAL(5,2) NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(event_id)
);