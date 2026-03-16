import { useContext, useMemo, useState } from 'react';
import { LanguageContext } from '../../../context/LanguageContext';
import DonateModal from '../DonateModal/DonateModal';
import styles from './Footer.module.css';

const Footer = () => {
  const { translations } = useContext(LanguageContext);
  const { footer } = translations;
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);

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

  const openDonateModal = () => setIsDonateModalOpen(true);
  const closeDonateModal = () => setIsDonateModalOpen(false);

  return (
    <>
      <footer className={styles.footer} id="contacts">
        <div className={styles.wrapper}>
          <div className={styles.container}>
            <div className={styles.inner}>
              <div className={styles.titleWrapper}>
                <h2 className={styles.title}>{footer.title}</h2>
              </div>
              <p className={styles.text}>{footer.text}</p>
              
              <div className={styles.actions}>
                <a 
                  className={styles.mail} 
                  href="mailto:vidrimers2@gmail.com"
                >
                  {footer.sendMessage}
                </a>

                <button 
                  className={styles.donateButton}
                  onClick={openDonateModal}
                  aria-label={footer.donate}
                >
                  <span className={styles.donateIcon}>❤️</span>
                  {footer.donate}
                </button>
              </div>

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

      <DonateModal 
        isOpen={isDonateModalOpen} 
        onClose={closeDonateModal} 
      />
    </>
  );
};

export default Footer;
