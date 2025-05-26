import { useEffect, useState } from 'react';
import Loading from './loading';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import GetMenuData from './fetcher';
import getAvgRatingsByType from './avg_rating';
import './css/dropdown.css';  

const firebaseConfig = {
  apiKey: "AIzaSyBPendkWM0LrYFYnruyqdOwe5-60MdRE7Q",
  projectId: "menu-4a32c"
};

function MainAdmin() {
  const [loading, setLoading] = useState(true);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [menuData, setMenuData] = useState({});
  const [ratings, setRatings] = useState({});

  useEffect(() => {
    const fetchMenuAndRatings = async () => {
      try {
        setLoading(true);
        const isoDate = calendarDate.toLocaleDateString('en-CA');

        const menu = await GetMenuData(firebaseConfig.projectId, isoDate);
        const { data: avgRatings } = await getAvgRatingsByType(firebaseConfig, isoDate);

        setMenuData(menu);
        setRatings(avgRatings);
      } catch (error) {
        console.error('Error fetching menu or ratings:', error.message);
        setMenuData({});
        setRatings({});
      } finally {
        setLoading(false);
      }
    };

    fetchMenuAndRatings();
  }, [calendarDate]);

  if (loading) return <Loading />;

  return (
    <div className="main-container">
      <div className="calendar-wrapper">
        <Calendar onChange={setCalendarDate} value={calendarDate} />
      </div>

      <h2 className="menu-title">Menu for {calendarDate.toDateString()}:</h2>

      {Object.keys(menuData).length === 0 ? (
        <p className="no-menu-message">No menu data available for this date.</p>
      ) : (
        <table className="menu-table">
          <thead>
            <tr>
              <th className="header-mealtype">Meal Type</th>
              <th className="header-item">Item</th>
              <th className="header-rating">Average Rating</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(menuData).map(([mealType, items]) =>
              items.map((item, idx) => (
                <tr
                  key={`${mealType}-${item}`}
                  className={idx % 2 === 0 ? 'row-even' : 'row-odd'}
                >
                  {idx === 0 && (
                    <td
                      className="meal-type-cell"
                      rowSpan={items.length}
                    >
                      {mealType}
                    </td>
                  )}
                  <td className="item-cell">{item}</td>
                  <td className="rating-cell">
                    {ratings[`${item}|${mealType}`] ? (
                      <span className="rating-positive">
                        {ratings[`${item}|${mealType}`].avg.toFixed(2)} ⭐ ({ratings[`${item}|${mealType}`].count})
                      </span>
                    ) : (
                      <span className="rating-none">No ratings</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>

        </table>
      )}
    </div>
  );
}

export default MainAdmin;
