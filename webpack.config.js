const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = (env) => {
  const isDev = env.mode === "development";
  const isProd = env.mode === "production";

  return {
    mode: env.mode ?? "development",
    entry: path.resolve(__dirname, "src", "index.js"),
    output: {
      path: path.resolve(__dirname, "build"),
      filename: "[name].[contenthash].js",
      assetModuleFilename: "images/[hash][ext][query]",
      clean: true,
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "src", "index.html"),
      }),
      isProd &&
        new MiniCssExtractPlugin({
          filename: "css/[name].[contenthash:8].css",
          chunkFilename: "css/[name].[contenthash:8].css",
        }),
    ],
    module: {
      rules: [
        {
          test: /\.m?js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
            },
          },
        },
        {
          test: /\.css$/i,
          use: [
            isProd ? MiniCssExtractPlugin.loader : "style-loader",
            "css-loader",
          ],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: "asset/resource",
        },
      ],
    },
    devServer: {
      port: 5000,
      open: true,
    },
  };
};
