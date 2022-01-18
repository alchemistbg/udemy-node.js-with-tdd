const express = require('express');

const app = express();
app.get('/', (req, res) => {
    res.status(200).send({
        message: "OK"
    });
});

app.listen(3000, () => {
    console.log("Server is up and listening on port 3000...")
});