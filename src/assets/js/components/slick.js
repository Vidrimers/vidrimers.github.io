import $ from 'jquery';
import 'slick-carousel';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

console.log("this is slick component");

let certificates = $(".certificates__items");

// Slick для сертификатов отключен - показываем все сразу
/*
certificates.slick({
  dots: false,
  arrows: false,
  infinite: true,
  slidesToShow: 2,
  slidesToScroll: 1,
  autoplay: true,
  speed: 800,
  adaptiveHeight: false,
  responsive: [
    { 
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          infinite: true,
        }
      },
    ]
});
*/

// $("#portfolio__arrow--prev").on("click", function (event) {
//   event.preventDefault();

//   portfolio.slick('slickPrev');
// });
// $("#portfolio__arrow--next").on("click", function (event) {
//   event.preventDefault();

//   portfolio.slick('slickNext');
// });