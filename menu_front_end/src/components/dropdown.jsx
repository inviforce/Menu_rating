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

  const toggleItem = (index) => {
    const updated = [...visibility];
    updated[index] = updated[index] === 1 ? 0 : 1;
    setVisibility(updated);
  };

  const handleStarClick = useCallback((item, starIndex) => {
    setRatings((prev) => ({
      ...prev,
      [item]: prev[item] === starIndex + 1 ? 0 : starIndex + 1,
    }));
  }, []);

  const fetchMenuAndInitialize = useCallback(async () => {
    try {
      const data = await GetMenuData(firebaseConfig.projectId);
      setMenuData(data);

      const initialRatings = {};
      Object.values(data).flat().forEach(item => initialRatings[item] = 0);
      setRatings(initialRatings);
    } catch (error) {
      console.error('Menu data error:', error.message);
    }
  }, []);

  const fetchPreviousRatings = useCallback(async () => {
    try {
      const previousRatings = await checkRatingsByName(name, firebaseConfig);
      if (previousRatings) {
        const flattened = Object.assign({}, ...previousRatings);
        setRatings((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(flattened).filter(([key]) => key in prev)
          )
        }));
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
          ...data
        }));
      }
    } catch (err) {
      console.error(`Error fetching stats for ${category}:`, err.message);
    }
  }, []);

  const handleSubmit = async (category) => {
    try {
      const payload = {
        type: category,
        name,
      };

      menuData[category].forEach(item => {
        payload[item] = ratings[item] || 0;
      });

      const response = await submitMenuRating(payload, firebaseConfig);
      console.log('Server response:', response);

      await fetchAvgRatings(category); // update stats immediately
    } catch (error) {
      console.error('Submission error:', error.message);
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
                    {menuData[category].map((menuItem) => (
                      <li className="menu-item" key={menuItem}>
                        <span className="menu-text">{menuItem}</span>

                        <div className="rating-container">
                          <div className="star_rating">
                            {[...Array(5)].map((_, starIndex) => (
                              <span
                                key={starIndex}
                                className={`star ${ratings[menuItem] > starIndex ? 'filled' : 'empty'}`}
                                onClick={() => handleStarClick(menuItem, starIndex)}
                              >
                                {ratings[menuItem] > starIndex ? '★' : '☆'}
                              </span>
                            ))}
                          </div>

                          {avgStats[menuItem] && (
                            <div className="menu-stats">
                              <span className="avg">Avg: {avgStats[menuItem].avg.toFixed(1)}</span>
                              <span className="count">Count: {avgStats[menuItem].count}</span>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button id="submit_button" onClick={() => handleSubmit(category)}>Submit</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default DropdownList;
