const path = require('path')

module.exports = {
  entry: {
    'index.tsx': [path.resolve(__dirname, 'src/index.tsx')],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    alias: {
      client: path.resolve(__dirname, 'src/'),
    },
    modules: ['../node_modules', '../common'],
  },
}