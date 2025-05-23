import { useEffect, useState } from 'react';
import './components_css/dropdown.css';
import HeaderCommon from './header_common';
import Loading from './loading';

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

  const fetchItemHistory = (type) => {
  return fetch('http://localhost:3767/avg_info', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({ type }),
  })
    .then(res => {
      if (!res.ok) {
        throw new Error('Failed to fetch item history');
      }
      return res.json();
    })
    .then(data => {
      if (data && data.data) {
        SetItem_hist(prev => ({
          ...prev,
          ...data.data, // merge new item stats into Item_hist
        }));
       
        return data.data; // optional return for chaining
      }
    })
    .catch(err => {
      console.error('Item history fetch error:', err.message);
    });
};

useEffect(() => {
  console.log("Updated Item_hist:", Item_hist);
}, [Item_hist]);

  const handle_submit = (category) => {
    const categoryItems = Data[category];
    const payload = {};

    if (categoryItems && Array.isArray(categoryItems)) {
      categoryItems.forEach(item => {
        payload[item] = ratings.hasOwnProperty(item) ? ratings[item] : 0;
      });
    }
    payload["type"]=category
    payload["name"]=name
    return fetch('http://localhost:3767/menu_rating', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(payload),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Server response:', data);
        sethelper(!helper)
        return data;
      })
      .catch(error => {
        console.error('Submission error:', error.message);
      });
  };


 useEffect(() => {
  fetch('http://localhost:3767/menu_data')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch menu data');
      }
      return response.json();
    })
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


useEffect(()=>{
  console.log("hey")

  fetch('http://localhost:3767/checker', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({ name }), 
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
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
          fetchItemHistory(category);
        });
      }
      setisAppready(true)
      } else {
        console.log('No ratings found for', name);
        setisAppready(true)
        
      }
      }
    )
    .catch(error => {
      console.error('Ratings fetch error:', error.message);
    });
    
},[helper,dataLoaded])

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
