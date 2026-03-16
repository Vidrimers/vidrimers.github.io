import { useContext, useMemo } from 'react';
import { LanguageContext } from '../../../context/LanguageContext';
import styles from './Footer.module.css';

const Footer = () => {
  const { translations } = useContext(LanguageContext);
  const { footer } = translations;

  // Мемоизируем массив социальных ссылок для оптимизации производительности
  const socialLinks = useMemo(() => [
    {
      href: "https://www.linkedin.com/in/yaroslav-shiryakov-79a426183/",
      label: "LinkedIn",
      icon: "/assets/img/ico/social/linkedin.png",
      alt: "LinkedIn"
    },
    {
      href: "https://t.me/Vidrimers",
      label: "Telegram", 
      icon: "/assets/img/ico/social/telegram.png",
      alt: "Telegram"
    }
  ], []);

  return (
    <footer className={styles.footer} id="contacts">
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.inner}>
            <div className={styles.titleWrapper}>
              <h2 className={styles.title}>{footer.title}</h2>
            </div>
            <p className={styles.text}>{footer.text}</p>
            <a 
              className={styles.mail} 
              href="mailto:vidrimers2@gmail.com"
            >
              {footer.sendMessage}
            </a>

            <div className={styles.social}>
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  className={styles.socialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  href={link.href}
                  aria-label={link.label}
                >
                  <img src={link.icon} alt={link.alt} />
                </a>
              ))}
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
