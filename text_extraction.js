// const tesseract = require("node-tesseract-ocr")
// const fs = require('fs');
// const path = '/home/effdot/Desktop/test.jpg';
// const img = "https://tesseract.projectnaptha.com/img/eng_bw.png"
// const config = {
//     lang: "eng",
//     oem: 1,
//     psm: 3,
//   }
//   fs.readFile(path, (err, data) => {
//     if (err) {
//       console.error(err);
//       return;
//     }
//     tesseract
//       .recognize(data, config)
//       .then(result => {
//         const text = result;
//         console.log(text);
//         // const stopsCompleted = text.match(/Stops\s+completed:\s+(\d+)/i);
//         // const deliveriesCompleted = text.match(/Deliveries\s+completed:\s+(\d+)/i);
//         // const pickupsCompleted = text.match(/Pickups\s+completed:\s+(\d+)/i);
  
//         // console.log(`Stops completed: ${stopsCompleted}`);
//         // console.log(`Deliveries completed: ${deliveriesCompleted}`);
//         // console.log(`Pickups completed: ${pickupsCompleted}`);
//       })
//       .catch((error) => {
//         console.log(error.message)
//       })
//   });
  




