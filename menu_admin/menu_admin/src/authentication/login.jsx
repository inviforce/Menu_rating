import React from 'react';
import { auth, provider, signInWithPopup } from './firebase'; 

const Login = () => {
  const signin = () => {
    signInWithPopup(auth, provider) 
      .then((result) => {
        console.log('User signed in:', result.user);
      })
      .catch((error) => {
        alert(error.message);
      });
  };

  return (
    <div>
      <center>
        <button className='signout_1'
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.05)'; 
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)'; 
          }}
          onClick={signin}
        >
          Sign In with Google
        </button>
      </center>
    </div>
  );
};

export default Login;
