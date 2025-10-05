import React from 'react';

const VehicleArrivalPage = () => {
  return (
    <div>
      <h2>Vehicle Arrival Details</h2>
      <form>
        {/* Vehicle Info */}
        <fieldset>
          <legend>Vehicle Information</legend>
          <label>Date: <input type="date" name="date" /></label>
          <label>Day: <input type="text" name="day" /></label>
          <label>Arrival Time: <input type="time" name="arrivalTime" /></label>
          <label>Departure Time: <input type="time" name="departureTime" /></label>
          <label>Station Name: <input type="text" name="stationName" /></label>
          <label>City: <input type="text" name="city" /></label>
          <label>Vehicle Number: <input type="text" name="vehicleNumber" /></label>
          <label>Driver Details: <input type="text" name="driverDetails" /></label>
          <label>Mobile Number: <input type="tel" name="mobileNumber" /></label>
        </fieldset>

        {/* Cart Section */}
        <fieldset>
          <legend>Cart Details</legend>
          <label>Serial Number: <input type="text" name="serialNumber" /></label>
          <label>Bility Number: <input type="text" name="bilityNumber" /></label>
          <label>Receiver Name: <input type="text" name="receiverName" /></label>
          <label>Item Details: <input type="text" name="itemDetails" /></label>
          <label>Quantity: <input type="number" name="quantity" /></label>
          <label>Delivery Charges: <input type="number" name="deliveryCharges" /></label>
        </fieldset>

        {/* Financial Section */}
        <fieldset>
          <legend>Financial Details</legend>
          <label>Total Amount: <input type="number" name="totalAmount" /></label>
          <label>Delivery: <input type="number" name="delivery" /></label>
          <label>Accountant: <input type="text" name="accountant" /></label>
          <label>Rewards: <input type="number" name="rewards" /></label>
          <label>Remaining Fare: <input type="number" name="remainingFare" /></label>
          <label>Cut: <input type="number" name="cut" /></label>
          <label>Commission: <input type="number" name="commission" /></label>
          <label>Separate: <input type="number" name="separate" /></label>
          <label>Received Amount: <input type="number" name="receivedAmount" /></label>
        </fieldset>

        {/* Note Section */}
        <fieldset>
          <legend>Note</legend>
          <textarea name="note" rows="3" />
        </fieldset>

        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default VehicleArrivalPage;