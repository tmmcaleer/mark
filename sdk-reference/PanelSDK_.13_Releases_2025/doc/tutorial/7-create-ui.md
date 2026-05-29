---
stoplight-id: nq0wdqaa9v3un
---

# Create the UI

## Introduction

This tutorial shows you how to add content to the files that you created in a previous tutorial.

## Prerequisites

- Tutorial - [Configure up Web App](6-set-up-web-app.md)

## Steps

1. Add the follwing content to the `index.html`:

```
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Echo API Sample</title>
    <meta name="viewport" content="width=device-width">
    <link rel="stylesheet" href="echo.css">

</head>

<body>
    <main>
        <div class="page" id="parameter-container">
            <div id="parameters"> 
                <h1>Echo</h1>
                <input type="text" id="echo-input">
                <br><br>
            </div>
            <div id="submit-button-div">
                <button type="submit" id="submit-button">Submit</button>
            </div>
        </div>

        <div class="page">
            <h1>Response</h1>
            <div id="response-container"></div>
        </div>
    </main>
    <script src="./echo.js"></script>
</body>

</html>

```

Pay attention to the html elements that we will reference from echo.js

We will retrieved text entered in “echo-input“, then click the “submit-button” to send an echo request to Media Composer. When the response arrives, it will be displayed under “response-container“. 

2. Modify `echo.css`with the following content to add styling.

```
body {
    font-family: Helvetica, Arial, sans-serif;
    text-align: left;
}

h1 {
    font-size: 28px;
    margin: 20px;
}

p {
    padding: 20px;
    margin: 30px auto;
    width: 50%;
    font-size: 18px;
}

button {
    border: 1px solid black;
    background-color: purple;
    padding: 8px;
    font: inherit;
    cursor: pointer;
    outline: none;
    color: white;
}

button:hover {
    background-color: #ccc;
    color: black;
}

main{
    display: flex;
    justify-content: space-around;
}
.page{
    height: 80em;
    display: block;
    padding: 1rem;
    margin: 1rem;
}

#submit-button-div {
    display: flex;
    align-items: center;
    justify-content: center;
}

```

The result is this simple UI:

![A new plugin page](images/new-plugin-page.png)


### Next Steps

Learn how to add echo functionality to the application

- [Implement the echo functionality](8-implement-echo.md)

