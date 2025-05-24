import { useEffect, useState } from 'react';
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


function DropdownList({ visibility, setVisibility,name }) {
  const items = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

  const toggleItem = (index) => {
    const newVisibility = [...visibility];
    newVisibility[index] = newVisibility[index] === 1 ? 0 : 1;
    setVisibility(newVisibility);
  };

  const [Data, SetData] = useState(null);
  const [ratings, setRatings] = useState({});
  const[helper,sethelper]=useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isAppready,setisAppready]=useState(false);
  const [Item_hist,SetItem_hist]=useState({});

  const handleStarClick = (item, starIndex) => {
    setRatings(prevRatings => {
      const currentRating = prevRatings[item] || 0;
      const newRating = currentRating === starIndex + 1 ? 0 : starIndex + 1;
      console.log(ratings)
      return {
        ...prevRatings,
        [item]: newRating
      };
    });
  };

  const fetchItemHistory = async (type, firebaseConfig) => {
    try {
      console.log(firebaseConfig.apiKey);
      const { data } = await getAvgRatingsByType(type, firebaseConfig);
  
      if (data) {
        SetItem_hist((prev) => ({
          ...prev,
          ...data, // merge today's avg rating stats into Item_hist
        }));
  
        return data;
      }
    } catch (err) {
      console.error('Item history fetch error:', err.message);
    }
  };

useEffect(() => {
  console.log("Updated Item_hist:", Item_hist);
}, [Item_hist]);

const handle_submit = async (category) => {
  try {
    const categoryItems = Data[category];
    const payload = {};

    if (categoryItems && Array.isArray(categoryItems)) {
      categoryItems.forEach(item => {
        payload[item] = ratings.hasOwnProperty(item) ? ratings[item] : 0;
      });
    }

    // Add type and name to payload
    payload.type = category;
    payload.name = name;

    // Call your Firestore submission function
    const data = await submitMenuRating(payload, firebaseConfig);

    console.log('Server response:', data);
    sethelper(!helper);

    return data;
  } catch (error) {
    console.error('Submission error:', error.message);
  }
};


 useEffect(() => {
  GetMenuData(firebaseConfig.projectId)
    .then(data => {
      console.log('Menu Data:', data);
      SetData(data); 

      const initialRatings = {};
      Object.values(data).forEach(itemList => {
        itemList.forEach(item => {
          initialRatings[item] = 0;
        });
      });
      setRatings(initialRatings);
      setDataLoaded(true); 
    })
    .catch(error => {
      console.error('Menu data error:', error.message);
    });
}, []);

useEffect(() => {
  console.log("hey");
  // Assuming `name` and `firebaseConfig` are available in scope
  checkRatingsByName(name, firebaseConfig)
    .then(data => {
      if (data) {
        const flattened = Object.assign({}, ...data);
        setRatings(prevRatings => ({
          ...prevRatings,
          ...Object.fromEntries(
            Object.entries(flattened).filter(([key]) => key in prevRatings)
          )
        }));

        if (Data) {
          Object.keys(Data).forEach(category => {
            fetchItemHistory(category, firebaseConfig);
          });
        }
        setisAppready(true);
      } else {
        console.log('No ratings found for', name);
        setisAppready(true);
      }
    })
    .catch(error => {
      console.error('Ratings fetch error:', error.message);
    });
}, [helper, dataLoaded]);

  return (
    <>
    {isAppready ? (
      <>
        <HeaderCommon />
        <div className="dropdown">
          <ul className="dropdown_list">
            {items.map((item, index) => (
              <li className="list_dropdown" key={index}>
                <button onClick={() => toggleItem(index)}>{item}</button>
                  <div className={`dropdown_content ${visibility[index] === 1 ? 'open' : ''}`}>
                    {Data && Data[item] && (
                      <ul>
                        {Data[item].map((menuItem, _) => (
                          <li className="menu-item">
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

                              {Item_hist[menuItem] && (
                                <div className="menu-stats">
                                  <span className="avg">Avg: {Item_hist[menuItem].avg.toFixed(1)}</span>
                                  <span className="count">Count: {Item_hist[menuItem].count}</span>
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button id='submit_button' onClick={()=>handle_submit(item)}>Submit</button>
                  </div>
                
              </li>
            ))}
          </ul>
        </div>
      </>):(<>
      <Loading/>
      </>
    )}
    </>
  );
}

export default DropdownList;
