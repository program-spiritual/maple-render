const path = require('path');
const {resolve} = require("path");

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
module.exports = {
  
  // generate source maps
  // devtool: 'source-map',
  
  // bundling mode
  mode: 'production',
  
  // entry files
  entry: './src/main.ts',
  
  // output bundles (location)
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
    libraryTarget: 'umd',
    library: 'maplerender',
    umdNamedDefine: true
  },
  
  // file resolutions
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': resolve('src')
    }
  },
  
  // loaders
  module: {
    rules: [
      {
        test: /\.tsx?/,
        use: ['babel-loader',],
        exclude: /node_modules/,
      },
      {
        test: /\.tsx?/,
        use: [{
          loader: "ts-loader",
          options: {transpileOnly:false }
        }],
        exclude: /node_modules/,
      }
    ]
  },
  
  // plugins
  plugins: [
    new ForkTsCheckerWebpackPlugin(), // run TSC on a separate thread
    new CleanWebpackPlugin(),
  ],
  
  // set watch mode to `true`
  watch: false
};
