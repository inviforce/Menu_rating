import { useEffect, useState, useCallback } from 'react';
import './components_css/dropdown.css';
import HeaderCommon from './header_common';
import Loading from './loading';
import GetMenuData from '../firebase/fetchMenuData';
import getAvgRatingsByType from '../firebase/getAvgRating';
import checkRatingsByName from '../firebase/checkRating';
import submitMenuRating from '../firebase/submitMenuRating';

const firebaseConfig = {
  apiKey: "AIzaSyAmacVQMKdZZRxgC9rKHX-LHN96L7BiSbA",
  authDomain: "some-23fc5.firebaseapp.com",
  projectId: "some-23fc5",
  storageBucket: "some-23fc5.firebasestorage.app",
  messagingSenderId: "683772900348",
  appId: "1:683772900348:web:8ac72d98c27e0bf3f6f879",
  measurementId: "G-7HQ641M1DQ"
};

const categories = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

const categoryTimeMap = {
  Breakfast: 9,
  Lunch: 14,
  Snacks: 17,
  Dinner: 21,
};

function DropdownList({ visibility, setVisibility, name }) {
  const [menuData, setMenuData] = useState(null);
  const [ratings, setRatings] = useState({});
  const [avgStats, setAvgStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotification, setShowNotification] = useState(null);
  const [dismissedNotifications, setDismissedNotifications] = useState(new Set());

  const toggleItem = (index) => {
    const updated = [...visibility];
    updated[index] = updated[index] === 1 ? 0 : 1;
    setVisibility(updated);
  };

  const handleStarClick = useCallback((item, category, starIndex) => {
    const key = `${category}|${item}`;
    setRatings((prev) => ({
      ...prev,
      [key]: prev[key] === starIndex + 1 ? 0 : starIndex + 1,
    }));
  }, []);

  const fetchMenuAndInitialize = useCallback(async () => {
    try {
      const data = await GetMenuData(firebaseConfig.projectId);
      setMenuData(data);

      const initialRatings = {};
      Object.entries(data).forEach(([category, items]) => {
        items.forEach(item => {
          const key = `${category}|${item}`;
          initialRatings[key] = 0;
        });
      });
      setRatings(initialRatings);
    } catch (error) {
      console.error('Menu data error:', error.message);
    }
  }, []);

  const fetchPreviousRatings = useCallback(async () => {
    try {
      const previousRatings = await checkRatingsByName(name, firebaseConfig);
      if (previousRatings) {
        setRatings((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(previousRatings).filter(([key]) => key in prev)
          ),
        }));
      } else {
        setRatings((prev) => {
          const resetRatings = {};
          Object.keys(prev).forEach(key => {
            resetRatings[key] = 0;
          });
          return resetRatings;
        });
      }
    } catch (error) {
      console.error('Ratings fetch error:', error.message);
    }
  }, [name]);

  const fetchAvgRatings = useCallback(async (category) => {
    try {
      const { data } = await getAvgRatingsByType(category, firebaseConfig);
      if (data) {
        setAvgStats((prev) => ({
          ...prev,
          ...data,
        }));
      }
    } catch (err) {
      console.error(`Error fetching stats for ${category}:`, err.message);
    }
  }, []);

  const handleSubmit = async (category) => {
    try {
      if (!menuData || !menuData[category]) return;

      setSubmitDisabled(true);
      setIsSubmitting(true);

      const payload = {
        type: category,
        name,
      };

      menuData[category].forEach(item => {
        const key = `${category}|${item}`;
        payload[item] = ratings[key] || 0;
      });

      await submitMenuRating(payload, firebaseConfig);
      await fetchAvgRatings(category);

      setTimeout(() => {
        setSubmitDisabled(false);
        setIsSubmitting(false);
      }, 1500);
    } catch (error) {
      console.error('Submission error:', error.message);
      setSubmitDisabled(false);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await fetchMenuAndInitialize();
    };
    initialize();
  }, [fetchMenuAndInitialize]);

  useEffect(() => {
    if (menuData) {
      fetchPreviousRatings();
      categories.forEach(fetchAvgRatings);
      setLoading(false);
    }
  }, [menuData, fetchPreviousRatings, fetchAvgRatings]);

  useEffect(() => {
    if (!menuData || !ratings) return;

    const currentHour = new Date().getHours();

    for (const category of categories) {
      const mealHour = categoryTimeMap[category];

      if (currentHour < mealHour) continue; // Not time yet
      if (dismissedNotifications.has(category)) continue;

      const items = menuData[category] || [];
      const allUnrated = items.every(item => {
        const key = `${category}|${item}`;
        return ratings[key] === 0;
      });

      if (allUnrated) {
        if (showNotification !== category) {
          setShowNotification(category);
        }
        return;
      }
    }

    // Clear notification if none applicable
    if (showNotification) {
      setShowNotification(null);
    }
  }, [menuData, ratings, dismissedNotifications, showNotification]);

  const dismissNotification = () => {
    setDismissedNotifications((prev) => new Set(prev).add(showNotification));
    setShowNotification(null);
  };

  if (loading) return <Loading />;

  return (
    <>
      <HeaderCommon />

      {showNotification && (
        <div className="notification-popup" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#fef3c7',
          border: '1px solid #facc15',
          padding: '10px 15px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 999,
        }}>
          <span>
            You haven’t rated any items for <strong>{showNotification}</strong>. Please rate them!
          </span>
          <button
            onClick={dismissNotification}
            style={{
              marginLeft: '10px',
              background: 'none',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              color: '#b91c1c',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="dropdown">
        <ul className="dropdown_list">
          {categories.map((category, index) => (
            <li className="list_dropdown" key={category}>
              <button onClick={() => toggleItem(index)}>{category}</button>
              <div className={`dropdown_content ${visibility[index] === 1 ? 'open' : ''}`}>
                {menuData?.[category] && (
                  <ul>
                    {menuData[category].map((menuItem) => {
                      const key = `${category}|${menuItem}`;

                      return (
                        <li className="menu-item" key={key}>
                          <span className="menu-text">{menuItem}</span>

                          <div className="rating-container">
                            <div className="star_rating">
                              {[...Array(5)].map((_, starIndex) => (
                                <span
                                  key={starIndex}
                                  className={`star ${ratings[key] > starIndex ? 'filled' : 'empty'}`}
                                  onClick={() => handleStarClick(menuItem, category, starIndex)}
                                >
                                  {ratings[key] > starIndex ? '★' : '☆'}
                                </span>
                              ))}
                            </div>

                            {avgStats[key] && (
                              <div className="menu-stats">
                                <span className="avg">Avg: {avgStats[key].avg.toFixed(1)}</span>
                                <span className="count">Count: {avgStats[key].count}</span>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <button
                  id="submit_button"
                  onClick={() => handleSubmit(category)}
                  disabled={submitDisabled}
                  style={{ cursor: submitDisabled ? 'not-allowed' : 'pointer', opacity: submitDisabled ? 0.6 : 1 }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default DropdownList;
