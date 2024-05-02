import styles from "./Footer.module.css"

function Footer(){

    return (
        <footer className={styles.footer}>
            <div>
            <p>Copyright: &copy; 2023 | <a href= "https://github.com/heartmxtion">CD team</a> | All Rights Reserved</p>
            <p><a href="#">Terms of Service</a> | <a href="#">Privacy Policy</a></p>
            </div>
        </footer>
    );
}

export default Footer;