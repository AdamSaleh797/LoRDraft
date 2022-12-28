const path = require('path');

module.exports = {
  entry: {
    'index.js': [
      path.resolve(__dirname, 'src/index.tsx'),
    ]
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, '../static'),
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)x?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
};
