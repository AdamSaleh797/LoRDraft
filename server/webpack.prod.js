const path = require('path')
const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge(common, {
  mode: 'production',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, '../dist/prod'),
  },
})
