const express = require('express');
require('dotenv').config({path: './config/config.env'});

// Load env files
const PORT = process.env.PORT || 5000;

const app = express();

app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} port: ${PORT}`));
