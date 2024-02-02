import express, { Router } from 'express';
import csv from 'csv-parser';
import { createReadStream } from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

// Read the CSV file
const hotels = [];

createReadStream('hotel_data.csv')
  .pipe(csv())
  .on('data', (row) => {

    // Remove unnecessary properties
    delete row['additional_info'];
    delete row['area'];
    delete row['crawl_date'];
    delete row['hotel_brand'];
    delete row['image_count'];
    delete row['locality'];
    delete row['point_of_interest'];
    delete row['province'];
    delete row['qts'];
    delete row['query_time_stamp'];
    delete row['review_count_by_category'];
    delete row['room_area'];
    delete row['room_count'];
    delete row['room_type'];
    delete row['similar_hotel'];
    delete row['site_review_count'];
    delete row['site_review_rating'];
    delete row['site_stay_review_rating'];
    delete row['sitename'];
    delete row['property_id'];
    delete row['guest_recommendation'];


    // Check for null or undefined values in the row
    const hasNullOrUndefinedValues = Object.values(row).some(value => value === null || value === undefined);

    // Only push the row if it doesn't have null or undefined values
    if (!hasNullOrUndefinedValues) {
      hotels.push(row);
    }
  })
  .on('end', () => {
    console.log('1st CSV file successfully processed.');
});


// Read the CSV file
const places = [];

createReadStream('Places.csv')
  .pipe(csv())
  .on('data', (row) => {  


    // Check for null or undefined values in the row
    const hasNullOrUndefinedValues = Object.values(row).some(value => value === null || value === undefined);

    // Only push the row if it doesn't have null or undefined values
    if (!hasNullOrUndefinedValues) {
      places.push(row);
    }
  })
  .on('end', () => {
    console.log('2nd CSV file successfully processed.');
});


const nearby_places = []

createReadStream('dataset.csv')
.pipe(csv())
.on('data', (row) => {

  delete row['Name']
  delete row['gender']
  delete row['prefeerences']
  delete row['Job']
  delete row['Country']
  delete row['Timezone']
  delete row['Address']

    // Check for null or undefined values in the row
    const hasNullOrUndefinedValues = Object.values(row).some(value => value === null || value === undefined);

    // Only push the row if it doesn't have null or undefined values
    if (!hasNullOrUndefinedValues) {
        nearby_places.push(row);
    }
})
  .on('end', () => {
    console.log('3rd file successfully processed')
  })



app.get('/', (req, res) => {
    res.send('Welcome')
});

app.get('/hotels_city', (req, res) => {
    res.send('Please enter city parameter')
});


app.get('/nearby_hotels/:latitude/:longitude/:distance?', (req, res) => {
  const { latitude, longitude, distance = 50 } = req.params;

  // Check if latitude and longitude are provided
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and Longitude must be provided.' });
  }

  // Use a Set to keep track of unique coordinates
  const uniqueCoordinates = new Set();

  const nearbyHotels = hotels
    .filter((hotel) => {
      const hotelLatitude = parseFloat(hotel.latitude);
      const hotelLongitude = parseFloat(hotel.longitude);

      // Calculate distance in kilometers using Haversine formula
      const distanceInKm = haversineDistance(parseFloat(latitude), parseFloat(longitude), hotelLatitude, hotelLongitude);

      // Check if the coordinates are unique
      const coordinatesKey = `${hotelLatitude}_${hotelLongitude}`;

      if (!uniqueCoordinates.has(coordinatesKey) && distanceInKm <= parseFloat(distance)) {
        uniqueCoordinates.add(coordinatesKey);
        return true;
      }

      return false;
    })
    .map((hotel) => {
      // Calculate distance for each hotel in the array
      const hotelDistance = haversineDistance(parseFloat(latitude), parseFloat(longitude), parseFloat(hotel.latitude), parseFloat(hotel.longitude));
      
      // Add the calculated distance to the hotel object
      return {
        ...hotel,
        distance: hotelDistance
      };
    })
    .sort((a, b) => a.distance - b.distance); // Sort by ascending order of distance

  if (nearbyHotels.length === 0) {
    return res.json({ message: 'Sorry, no nearby hotels found within the specified distance.' });
  }

  res.json(nearbyHotels);
});


app.get('/nearby_places/:latitude/:longitude/:distance?', (req, res) => {
  const { latitude, longitude, distance = 500 } = req.params;

  // Check if latitude and longitude are provided
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and Longitude must be provided.' });
  }

  // Use a Set to keep track of unique coordinates
  const uniqueCoordinates = new Set();

  const nearbyPlaces = nearby_places
    .filter((nearby_place) => {
      const placeLatitude = parseFloat(nearby_place.Lat);
      const placeLongitude = parseFloat(nearby_place.Long);

      // Calculate distance in kilometers using Haversine formula
      const distanceInKm = haversineDistance(parseFloat(latitude), parseFloat(longitude), placeLatitude, placeLongitude);

      // Check if the coordinates are unique
      const coordinatesKey = `${placeLatitude}_${placeLongitude}`;
      if (!uniqueCoordinates.has(coordinatesKey) && distanceInKm <= parseFloat(distance)) {
        uniqueCoordinates.add(coordinatesKey);
        return true;
      }

      return false;
    })
    .map((nearby_place) => {
      // Calculate distance for each place in the array
      const placeDistance = haversineDistance(parseFloat(latitude), parseFloat(longitude), parseFloat(nearby_place.Lat), parseFloat(nearby_place.Long));

      // Add the calculated distance to the place object
      return {
        ...nearby_place,
        distance: placeDistance
      };
    })
    .sort((a, b) => a.distance - b.distance); // Sort by ascending order of distance

  if (nearbyPlaces.length === 0) {
    return res.json({ message: 'Sorry, no nearby places found within the specified distance.' });
  }

  res.json(nearbyPlaces);
});



function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers

  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}



// Define a route to get hotels by city
app.get('/hotels_city/:city', (req, res) => {
  const { city } = req.params;

  if (!city) {
    return res.status(400).json({ error: 'City parameter is required.' });
  }

  const cityHotels = hotels.filter((hotel) => hotel.city.toLowerCase() === city.toLowerCase());

  if (cityHotels.length === 0) {
    return res.json({ message: 'Sorry, no hotels available for this city.' });
  }

  cityHotels.sort((a, b) => b.hotel_star_rating - a.hotel_star_rating)

  res.json(cityHotels);
});


app.get('/nearby_hotels', (req, res) => {
  res.send("Enter latitude and longitude as parameter")
})


app.get('/places_city', (req, res) => {
  res.send('Please enter city parameter')
});


// Define a route to get places by city
app.get('/places_city/:city', (req, res) => {
  const { city } = req.params;

  if (!city) {
    return res.status(400).json({ error: 'City parameter is required.' });
  }

  const cityPlaces = places.filter((place) => place.City && place.City.toLowerCase() === city.toLowerCase());

  if (cityPlaces.length === 0) {
    return res.json({ message: 'Sorry, no Places available for this city.' });
  }

  // Sort cityPlaces by hotel_star_rating 

  cityPlaces.sort((a, b) => b.Ratings - a.Ratings)

  res.json(cityPlaces);
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
