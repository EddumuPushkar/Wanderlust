const mongoose = require('mongoose');
const initData = require('./data');
const Listing = require('../models/listing');

const MONGOURL = "mongodb://127.0.0.1:27017/wanderlust";

main()
  .then(() => console.log("connected to mongo"))

  .catch(err => console.log(err));

async function main(){
    await mongoose.connect(MONGOURL);
}
const initDB = async () => {
    await Listing.deleteMany({});
    initData.data = initData.data.map((obj) =>  ({...obj, owner: "68f0b09a762465de9cfa761d"}));
    await Listing.insertMany(initData.data);
    console.log("DB Initialized with data");
}
initDB();