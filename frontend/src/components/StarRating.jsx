import { useState } from 'react';

export default function StarRating({ rating = 0, onRate, readOnly = true, size = '16px' }) {
  const [hoverRating, setHoverRating] = useState(0);

  const handleMouseEnter = (index) => {
    if (!readOnly) setHoverRating(index);
  };

  const handleMouseLeave = () => {
    if (!readOnly) setHoverRating(0);
  };

  const handleClick = (index) => {
    if (!readOnly && onRate) onRate(index);
  };

  const currentRating = hoverRating || rating;

  return (
    <div className="d-inline-flex align-items-center gap-1" onMouseLeave={handleMouseLeave}>
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={`bi ${star <= currentRating ? 'bi-star-fill' : 'bi-star'}`}
          style={{
            fontSize: size,
            color: star <= currentRating ? '#FFC107' : '#E9ECEF',
            cursor: readOnly ? 'default' : 'pointer',
            transition: 'color 0.2s ease-in-out'
          }}
          onMouseEnter={() => handleMouseEnter(star)}
          onClick={() => handleClick(star)}
          aria-label={`${star} star`}
        ></i>
      ))}
    </div>
  );
}
