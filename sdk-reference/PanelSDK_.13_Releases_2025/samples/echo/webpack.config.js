const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/echo.js',
  output: {
    filename: 'echo.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      }
    ]
  },
  devtool: 'eval'
};
