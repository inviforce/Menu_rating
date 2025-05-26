import { useEffect, useState, useCallback } from 'react';
import './components_css/dropdown.css';
import HeaderCommon from './header_common';
import Loading from './loading';
import GetMenuData from '../firebase/fetchMenuData';
import getAvgRatingsByType from '../firebase/getAvgRating';
import checkRatingsByName from '../firebase/checkRating';
import submitMenuRating from '../firebase/submitMenuRating';

const firebaseConfig = {
  apiKey: "AIzaSyBPendkWM0LrYFYnruyqdOwe5-60MdRE7Q",
  projectId: "menu-4a32c"
};

const categories = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

function DropdownList({ visibility, setVisibility, name }) {
  const [menuData, setMenuData] = useState(null);
  const [ratings, setRatings] = useState({});
  const [avgStats, setAvgStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleItem = (index) => {
    const updated = [...visibility];
    updated[index] = updated[index] === 1 ? 0 : 1;
    setVisibility(updated);
  };

  const askForNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('🔔 Notification permission granted');
      // (Optional) Show a welcome notification
      new Notification('Thanks!', {
        body: 'Notifications are now enabled.',
      });
    } else if (permission === 'denied') {
      console.log('🚫 Notification permission denied');
    } else {
      console.log('🔄 Notification dismissed');
    }
  };

  useEffect(() => {
    const handleAppInstalled = () => {
      console.log('✅ App installed as PWA!');
      setTimeout(() => {
        askForNotificationPermission();
      }, 1000); // Ask 1 second after install
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

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
        // Explicitly reset all ratings to zero if no previous ratings found
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

  if (loading) return <Loading />;

  return (
    <>
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
