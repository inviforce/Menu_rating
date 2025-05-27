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

function DropdownList({ visibility, setVisibility, name }) {
  const [menuData, setMenuData] = useState(null);
  const [ratings, setRatings] = useState({});
  const [avgStats, setAvgStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notification state
  const [showNotification, setShowNotification] = useState(null);

  const toggleItem = (index) => {
    const updated = [...visibility];
    updated[index] = updated[index] === 1 ? 0 : 1;
    setVisibility(updated);
  };

  // Meal times (24h format)
  const mealTimes = {
    Breakfast: { start: 8, end: 12 },
    Lunch: { start: 12, end: 15 },
    Snacks: { start: 15, end: 18 },
    Dinner: { start: 18, end: 24 },
  };

  const hasMealTimePassed = (meal) => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= mealTimes[meal].end;
  };

  // Handle star click with compound key "category|item"
  const handleStarClick = useCallback((item, category, starIndex) => {
    const key = `${category}|${item}`;
    setRatings((prev) => ({
      ...prev,
      [key]: prev[key] === starIndex + 1 ? 0 : starIndex + 1,
    }));
  }, []);

  // Fetch menu data and initialize ratings keys with compound keys
  const fetchMenuAndInitialize = useCallback(async () => {
    try {
      const data = await GetMenuData(firebaseConfig.projectId);
      console.log(data);
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

  // Fetch previous ratings and merge them using compound keys
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
        // Reset all ratings to zero if no previous ratings found
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

  // Fetch average ratings for a category and merge into avgStats
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

  // Submit ratings by category, transforming compound keys back into item keys
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

      const response = await submitMenuRating(payload, firebaseConfig);

      // Refresh averages after submission
      await fetchAvgRatings(category);

      // Re-enable submit button after 1.5 seconds
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

  // Initial load: menu + user rating + stats
  useEffect(() => {
    const initialize = async () => {
      console.log("hey");
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

  // Check for missed ratings after data is loaded
  useEffect(() => {
    if (!menuData || !ratings) return;

    for (const category of categories) {
      if (hasMealTimePassed(category)) {
        const items = menuData[category] || [];
        const anyRated = items.some(item => {
          const key = `${category}|${item}`;
          return ratings[key] > 0;
        });

        if (!anyRated) {
          if (showNotification !== category) {
            setShowNotification(category);
          }
          break; // notify only for first missed meal found
        }
      }
    }
  }, [menuData, ratings, showNotification]);

  if (loading) return <Loading />;

  return (
    <>
      {showNotification && (
        <div className="notification-popup" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 0 10px rgba(0,0,0,0.2)',
          zIndex: 9999,
          maxWidth: '300px',
        }}>
          <p>Please rate your <strong>{showNotification}</strong> menu items! Your feedback matters.</p>
          <button onClick={() => setShowNotification(null)} style={{
            background: 'transparent',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            color: '#721c24',
            fontSize: '16px',
            marginTop: '5px',
          }}>Dismiss</button>
        </div>
      )}

      <HeaderCommon />
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
