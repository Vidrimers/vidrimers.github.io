module.exports = {
  plugins: {
    autoprefixer: {
      overrideBrowserslist: [
        'last 5 versions',
        '> 1%',
        'not dead',
        'not ie <= 11'
      ],
      grid: 'autoplace',
      flexbox: 'no-2009'
    }
  }
}