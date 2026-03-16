import { useContext } from 'react';
import { LanguageContext } from '../../../context/LanguageContext';
import styles from './Footer.module.css';

const Footer = () => {
  const { translations } = useContext(LanguageContext);
  const { footer } = translations;

  return (
    <footer className={styles.footer} id="contacts">
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.inner}>
            <h2 className={styles.title}>{footer.title}</h2>
            <p className={styles.text}>{footer.text}</p>
            <a 
              className={styles.mail} 
              href="mailto:vidrimers2@gmail.com"
            >
              {footer.sendMessage}
            </a>

            <div className={styles.social}>
              <a
                className={styles.socialLink}
                target="_blank"
                rel="noopener noreferrer"
                href="https://www.linkedin.com/in/yaroslav-shiryakov-79a426183/"
                aria-label="LinkedIn"
              >
                <img src="/assets/img/ico/social/linkedin.png" alt="LinkedIn" />
              </a>

              <a
                className={styles.socialLink}
                target="_blank"
                rel="noopener noreferrer"
                href="https://t.me/Vidrimers"
                aria-label="Telegram"
              >
                <img src="/assets/img/ico/social/telegram.png" alt="Telegram" />
              </a>
            </div>

            <p className={styles.bottom}>{footer.findMe}</p>
            <p className={styles.bottom}>{footer.onSocial}</p>
            <p className={styles.bottom}>{footer.thanks}</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
