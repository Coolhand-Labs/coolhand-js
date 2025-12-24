const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/coolhand.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'coolhand.min.js' : 'coolhand.js',
      library: {
        name: 'CoolhandJS',
        type: 'umd'
      },
      globalObject: 'this'
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: false,
            },
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
    },
    devServer: {
      static: [
        {
          directory: path.join(__dirname, 'examples'),
        },
        {
          directory: path.join(__dirname, 'dist'),
          publicPath: '/dist',
        }
      ],
      compress: true,
      port: 3333,
      open: false,
      hot: true,
      liveReload: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
      }
    },
  };
};