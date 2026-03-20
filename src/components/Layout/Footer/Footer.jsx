import { useContext, useMemo, useState, useEffect } from 'react';
import { LanguageContext } from '../../../context/LanguageContext';
import DonateModal from '../DonateModal/DonateModal';
import AdminIndicator from '../../Admin/AdminIndicator';
import FooterAdmin from '../../Admin/FooterAdmin';
import { sendDonateModalNotification } from '../../../utils/telegramNotifications';
import styles from './Footer.module.css';

// Рендер иконки для платформы по типу
const renderLinkIcon = (name, iconData) => {
  if (!iconData || typeof iconData !== 'object') {
    return <span className={styles.socialText}>{name}</span>;
  }
  const { iconType, iconValue } = iconData;
  if (iconType === 'fa' && iconValue) {
    return <i className={iconValue} aria-hidden="true" />;
  }
  if (iconType === 'emoji' && iconValue) {
    return <span className={styles.socialEmoji}>{iconValue}</span>;
  }
  if (iconType === 'file' && iconValue) {
    return <img src={iconValue} alt={name} className={styles.socialIconImg} />;
  }
  return <span className={styles.socialText}>{name}</span>;
};

const Footer = () => {
  const { language, translations } = useContext(LanguageContext);
  const { footer: fallbackFooter } = translations;

  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [isFooterAdminOpen, setIsFooterAdminOpen] = useState(false);

  const [apiContacts, setApiContacts] = useState(null);
  const [apiFooter, setApiFooter] = useState(null);

  useEffect(() => {
    loadContacts();
    loadFooterContent();
  }, []);

  const loadContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setApiContacts(data.data);
    } catch {
      setApiContacts(null);
    }
  };

  const loadFooterContent = async () => {
    try {
      const res = await fetch('/api/footer');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setApiFooter(data.data);
    } catch {
      setApiFooter(null);
    }
  };

  // Тексты футера: из API или из translations (fallback)
  const texts = useMemo(() => {
    if (apiFooter) {
      return language === 'ru' ? apiFooter.ru : apiFooter.en;
    }
    return fallbackFooter;
  }, [apiFooter, language, fallbackFooter]);

  // Социальные ссылки из otherLinks
  const socialLinks = useMemo(() => {
    if (!apiContacts?.otherLinks) {
      // Fallback — хардкод
      return [
        {
          href: 'https://www.linkedin.com/in/yaroslav-shiryakov-79a426183/',
          label: 'LinkedIn',
          renderIcon: () => <img src="/assets/img/ico/social/linkedin.png" alt="LinkedIn" />
        },
        {
          href: 'https://t.me/Vidrimers',
          label: 'Telegram',
          renderIcon: () => <img src="/assets/img/ico/social/telegram.png" alt="Telegram" />
        }
      ];
    }

    return Object.entries(apiContacts.otherLinks)
      .filter(([, val]) => {
        const href = typeof val === 'object' ? val.url : val;
        if (!href) return false;
        // Фильтруем скрытые ссылки
        if (typeof val === 'object' && val.isHidden) return false;
        return true;
      })
      .map(([name, val]) => {
        const href = typeof val === 'object' ? val.url : val;
        return {
          href,
          label: name,
          renderIcon: () => renderLinkIcon(name, typeof val === 'object' ? val : null)
        };
      });
  }, [apiContacts]);

  const emailHref = apiContacts?.email
    ? `mailto:${apiContacts.email}`
    : 'mailto:vidrimers2@gmail.com';

  const openDonateModal = async () => {
    setIsDonateModalOpen(true);
    await sendDonateModalNotification();
  };

  return (
    <>
      <footer className={styles.footer} id="contacts">
        <div className={styles.wrapper}>
          <div className={styles.container}>
            <div className={styles.inner}>

              <div className={styles.titleWrapper}>
                <h2 className={styles.title}>
                  {texts.title}
                  <AdminIndicator
                    section="Футер"
                    onClick={() => setIsFooterAdminOpen(true)}
                  />
                </h2>
              </div>

              <p className={styles.text}>{texts.text}</p>

              <div className={styles.actions}>
                <div className={styles.mailWrapper}>
                  <a className={styles.mail} href={emailHref}>
                    {texts.sendMessage}
                  </a>
                </div>

                <div className={styles.donateWrapper}>
                  <button
                    className={styles.donateButton}
                    onClick={openDonateModal}
                    aria-label={texts.donate}
                  >
                    <span className={styles.donateIcon}>❤️</span>
                    {texts.donate}
                  </button>
                </div>
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
                    {link.renderIcon()}
                  </a>
                ))}
              </div>

              <p className={styles.bottom}>{texts.findMe}</p>
              <p className={styles.bottom}>{texts.onSocial}</p>
              <p className={styles.bottom}>{texts.thanks}</p>
            </div>
          </div>
        </div>
      </footer>

      <DonateModal isOpen={isDonateModalOpen} onClose={() => setIsDonateModalOpen(false)} />

      <FooterAdmin
        isOpen={isFooterAdminOpen}
        onClose={() => {
          setIsFooterAdminOpen(false);
          loadFooterContent();
          loadContacts();
        }}
      />
    </>
  );
};

export default Footer;
