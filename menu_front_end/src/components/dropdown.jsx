import { useEffect, useState } from 'react';
import './components_css/dropdown.css';

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
      setDataLoaded(true); // ✅ indicate data is ready
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
        
      } else {
        console.log('No ratings found for', name);
      }
    })
    .catch(error => {
      console.error('Ratings fetch error:', error.message);
    });
},[helper,dataLoaded])

  return (
    <div className="dropdown">
      <ul className="dropdown_list">
        {items.map((item, index) => (
          <li className="list_dropdown" key={index}>
            <button onClick={() => toggleItem(index)}>{item}</button>
            {visibility[index] === 1 && (
              <div className="dropdown_content">
                {Data && Data[item] && (
                  <ul>
                    {Data[item].map((menuItem, _) => (
                      <li className="menu-item">
                        <span className="menu-text">{menuItem}</span>
                        <div className="star_rating">
                        {[...Array(5)].map((_, starIndex) => (
                          <span
                            key={starIndex}
                            className={`star ${ratings[menuItem] > starIndex ? 'filled' : 'empty'}`}
                            onClick={() => handleStarClick(menuItem, starIndex)}>
                            {ratings[menuItem] > starIndex ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button id='submit_button' onClick={()=>handle_submit(item)}>Submit</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DropdownList;
