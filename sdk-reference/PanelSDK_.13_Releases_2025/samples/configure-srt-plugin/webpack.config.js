const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/js/mcapi-configureSRTStream.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist/app/src'),
    library: {
      name: 'grpc',
      type: 'umd',
    },
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
