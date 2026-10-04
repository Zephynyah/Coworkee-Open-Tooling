const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const portfinder = require('portfinder');

module.exports = async function (env, argv) {
  const mode = (argv && argv.mode) || 'development';
  const isProd = mode === 'production';

  portfinder.basePort = (env && env.port) || 1962;
  const port = await portfinder.getPortPromise();

  return {
    mode: mode,
    performance: { hints: false },
    devtool: isProd ? false : 'inline-source-map',
    context: path.join(__dirname, './'),
    entry: {
      main: './app.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      publicPath: ''
    },
    // Treat Ext as an external global from the statically loaded ext-all.js
    externals: {
      Ext: 'Ext'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/
        }
      ]
    },
    plugins: [
      // 1. Copy the pre-built Ext JS static files to output
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'client/ext/build/ext-all.js'),
            to: 'ext/ext-all.js'
          },
          {
            from: path.resolve(__dirname, 'client/ext/build/modern/theme-triton/resources'),
            to: 'ext/resources'
          },
          {
            from: path.resolve(__dirname, 'client/ext/build/modern/theme-triton/theme-triton.js'),
            to: 'ext/theme-triton.js'
          }
        ]
      }),

      // 2. Inject output app bundle into HTML
      new HtmlWebpackPlugin({
        template: 'index.html',
        hash: true,
        inject: 'body'
      })
    ],
    devServer: {
      contentBase: path.resolve(__dirname, 'dist'),
      historyApiFallback: true,
      host: '0.0.0.0',
      port: port,
      compress: isProd,
      inline: !isProd,
      stats: 'errors-warnings'
    }
  };
};