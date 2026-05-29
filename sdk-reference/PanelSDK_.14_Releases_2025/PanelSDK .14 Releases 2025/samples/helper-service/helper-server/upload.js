const axios = require("axios");
const config = require('./config.js');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');


function upload(req, res) {
    const filePath = req.body.filePath;
    if (!filePath) {
        return res.status(400).send('No file uploaded.');
    }

    const file = fs.createReadStream(filePath);
    const formData = new FormData();
    formData.append('file', file);

    axios.post(config.uploadServerAddress, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    }).then(response => {
        console.log(response.data);
        res.send(response.data)
    }).catch(error => {
        console.error(error);
        // res.error(response)
    });
}



module.exports = upload;
