import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LanguageContext } from '../../../context/LanguageContext';
import DonateModal from './DonateModal';

// Мокаем переводы
const mockTranslations = {
  donate: {
    title: 'Поддержать автора',
    description: 'Спасибо за поддержку проекта ❤️',
    copyAddress: 'Скопировать адрес',
    copied: 'Адрес скопирован!'
  }
};

const MockLanguageProvider = ({ children }) => (
  <LanguageContext.Provider value={{ translations: mockTranslations }}>
    {children}
  </LanguageContext.Provider>
);

describe('DonateModal', () => {
  it('не отображается когда закрыта', () => {
    render(
      <MockLanguageProvider>
        <DonateModal isOpen={false} onClose={() => {}} />
      </MockLanguageProvider>
    );
    
    expect(screen.queryByText('Поддержать автора')).not.toBeInTheDocument();
  });

  it('отображается когда открыта', () => {
    render(
      <MockLanguageProvider>
        <DonateModal isOpen={true} onClose={() => {}} />
      </MockLanguageProvider>
    );
    
    expect(screen.getByText('Поддержать автора')).toBeInTheDocument();
    expect(screen.getByText('Спасибо за поддержку проекта ❤️')).toBeInTheDocument();
  });

  it('отображает все кошельки', () => {
    render(
      <MockLanguageProvider>
        <DonateModal isOpen={true} onClose={() => {}} />
      </MockLanguageProvider>
    );
    
    expect(screen.getByText('Kaspa')).toBeInTheDocument();
    expect(screen.getByText('TON')).toBeInTheDocument();
    expect(screen.getByText('USDT (TRC-20)')).toBeInTheDocument();
  });

  it('вызывает onClose при клике на кнопку закрытия', () => {
    const mockOnClose = vi.fn();
    
    render(
      <MockLanguageProvider>
        <DonateModal isOpen={true} onClose={mockOnClose} />
      </MockLanguageProvider>
    );
    
    const closeButton = screen.getByLabelText('Закрыть');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('отображает QR коды для всех кошельков', () => {
    render(
      <MockLanguageProvider>
        <DonateModal isOpen={true} onClose={() => {}} />
      </MockLanguageProvider>
    );
    
    const qrImages = screen.getAllByRole('img');
    // Должно быть 3 QR кода (по одному для каждого кошелька)
    const qrCodes = qrImages.filter(img => img.alt.includes('QR код'));
    expect(qrCodes).toHaveLength(3);
  });
});