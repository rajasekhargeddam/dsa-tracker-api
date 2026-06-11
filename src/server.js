require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  if (!process.env.MONGO_URI) {
    console.error('Error: MONGO_URI is not defined in .env file');
    process.exit(1);
  }

  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
