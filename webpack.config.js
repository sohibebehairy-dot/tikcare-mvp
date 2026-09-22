const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background/index.ts',
    content:    './src/content/index.ts',
    popup:      './src/popup/index.ts',
    dashboard:  './src/dashboard/dashboard.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json',           to: 'manifest.json' },
        { from: 'src/popup/index.html',        to: 'popup.html' },
        { from: 'src/styles/foundation.css',   to: 'foundation.css' },
        { from: 'src/dashboard/dashboard.html',to: 'dashboard.html' },
        { from: 'src/dashboard/dashboard.css', to: 'dashboard.css' },
        { from: 'src/child/child.css',         to: 'child.css' },
      ],
    }),
  ],
};
