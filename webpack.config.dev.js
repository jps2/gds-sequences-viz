const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  plugins: [
    new CleanWebpackPlugin(['dev']),
        ],
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dev')
},
mode: 'production',
optimization: {
   usedExports: true
}
};