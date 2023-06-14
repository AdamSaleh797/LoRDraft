const path = require('path')

module.exports = {
  entry: {
    index: [path.resolve(__dirname, 'src/index.ts')],
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
    extensions: ['.tsx', '.mts', '.ts', '.jsx', '.mjs', '.js'],
    alias: {
      server: path.resolve(__dirname, 'src/'),
      common: path.resolve(__dirname, '../common/'),
    },
    modules: ['../node_modules'],
  },
  target: 'node',
  externals: { bufferutil: 'bufferutil' },
}
