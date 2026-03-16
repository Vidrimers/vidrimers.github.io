/**
 * Пример использования хука useLikes
 * 
 * Этот файл показывает, как использовать хук useLikes в компонентах
 */

import React from 'react';
import { useLikes } from './useLikes';

// Пример компонента, который использует хук useLikes
function LikeButtonExample({ projectId }) {
  const { likes, isLiked, isLoading, error, toggleLike } = useLikes(projectId);

  if (error) {
    return <div>Ошибка: {error}</div>;
  }

  return (
    <button 
      onClick={toggleLike} 
      disabled={isLoading}
      style={{
        background: isLiked ? '#ff6b6b' : '#f0f0f0',
        color: isLiked ? 'white' : '#333',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        opacity: isLoading ? 0.6 : 1
      }}
    >
      {isLoading ? '...' : `❤️ ${likes}`}
    </button>
  );
}

// Пример использования в компоненте портфолио
function PortfolioItemExample({ project }) {
  const { likes, isLiked, toggleLike } = useLikes(project.id);

  return (
    <div className="portfolio-item">
      <img src={project.image} alt={project.title} />
      <h3>{project.title}</h3>
      <p>{project.description}</p>
      
      {/* Кнопка лайка */}
      <div className="like-section">
        <button 
          onClick={toggleLike}
          className={`like-button ${isLiked ? 'liked' : ''}`}
        >
          <span className="heart">❤️</span>
          <span className="count">{likes}</span>
        </button>
      </div>
    </div>
  );
}

export { LikeButtonExample, PortfolioItemExample };