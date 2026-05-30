// templates/otpTemplate.js

export const otpTemplate = (otp) => {

  return `
  
    <div>
    
      <h1>Your OTP is ${otp}</h1>

      <p>This OTP will expire in 5 minutes.</p>

    </div>
  
  `;
};