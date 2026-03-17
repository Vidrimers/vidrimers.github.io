import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LikeButton from './LikeButton';

// Мокаем хук useLikes
vi.mock('../../hooks/useLikes', () => ({
  useLikes: vi.fn()
}));

// Мокаем CSS модуль
vi.mock('./LikeButton.module.css', () => ({
  default: {
    likeButton: 'likeButton',
    liked: 'liked',
    loading: 'loading',
    animating: 'animating',
    error: 'error',
    heart: 'heart',
    heartLiked: 'heartLiked',
    heartAnimating: 'heartAnimating',
    count: 'count',
    loader: 'loader',
    loaderDot: 'loaderDot'
  }
}));

import { useLikes } from '../../hooks/useLikes';

describe('LikeButton', () => {
  const mockToggleLike = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Базовая настройка мока
    useLikes.mockReturnValue({
      likes: 5,
      isLiked: false,
      isLoading: false,
      error: null,
      toggleLike: mockToggleLike
    });
  });

  it('рендерится с корректными данными', () => {
    render(<LikeButton projectId="test-project" />);
    
    // Проверяем, что кнопка отображается
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    
    // Проверяем, что отображается количество лайков
    expect(screen.getByText('5')).toBeInTheDocument();
    
    // Проверяем, что отображается пустое сердечко (не лайкнуто)
    expect(screen.getByText('♡')).toBeInTheDocument();
  });

  it('отображает заполненное сердечко когда проект лайкнут', () => {
    useLikes.mockReturnValue({
      likes: 10,
      isLiked: true,
      isLoading: false,
      error: null,
      toggleLike: mockToggleLike
    });
    
    render(<LikeButton projectId="test-project" />);
    
    // Проверяем, что отображается заполненное сердечко
    expect(screen.getByText('♥')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('показывает состояние загрузки', () => {
    useLikes.mockReturnValue({
      likes: 5,
      isLiked: false,
      isLoading: true,
      error: null,
      toggleLike: mockToggleLike
    });
    
    render(<LikeButton projectId="test-project" />);
    
    // Проверяем, что отображается индикатор загрузки
    expect(screen.getByText('...')).toBeInTheDocument();
    
    // Проверяем, что кнопка заблокирована
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('показывает состояние ошибки', () => {
    useLikes.mockReturnValue({
      likes: 0,
      isLiked: false,
      isLoading: false,
      error: 'Ошибка сети',
      toggleLike: mockToggleLike
    });
    
    render(<LikeButton projectId="test-project" />);
    
    // При ошибке должен отображаться минимальный UI
    expect(screen.getByText('♡')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('вызывает toggleLike при клике', async () => {
    render(<LikeButton projectId="test-project" />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockToggleLike).toHaveBeenCalledTimes(1);
  });

  it('не вызывает toggleLike при клике во время загрузки', () => {
    useLikes.mockReturnValue({
      likes: 5,
      isLiked: false,
      isLoading: true,
      error: null,
      toggleLike: mockToggleLike
    });
    
    render(<LikeButton projectId="test-project" />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockToggleLike).not.toHaveBeenCalled();
  });

  it('передает правильный projectId в хук useLikes', () => {
    render(<LikeButton projectId="my-project-123" />);
    
    expect(useLikes).toHaveBeenCalledWith('my-project-123', undefined);
  });

  it('имеет корректные aria-атрибуты для доступности', () => {
    render(<LikeButton projectId="test-project" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Поставить лайк. Текущее количество лайков: 5');
    expect(button).toHaveAttribute('title', 'Поставить лайк');
  });

  it('обновляет aria-атрибуты для лайкнутого состояния', () => {
    useLikes.mockReturnValue({
      likes: 10,
      isLiked: true,
      isLoading: false,
      error: null,
      toggleLike: mockToggleLike
    });
    
    render(<LikeButton projectId="test-project" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Убрать лайк. Текущее количество лайков: 10');
    expect(button).toHaveAttribute('title', 'Убрать лайк');
  });

  it('применяет дополнительные CSS классы', () => {
    render(<LikeButton projectId="test-project" className="custom-class" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('предотвращает всплытие события при клике', () => {
    const parentClickHandler = vi.fn();
    
    render(
      <div onClick={parentClickHandler}>
        <LikeButton projectId="test-project" />
      </div>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Родительский обработчик не должен вызываться
    expect(parentClickHandler).not.toHaveBeenCalled();
    expect(mockToggleLike).toHaveBeenCalledTimes(1);
  });
});