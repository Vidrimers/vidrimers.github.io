console.log("portfolio-tabs.js is loaded");

$(document).ready(function () {
  $(".portfolio__tabs-item").click(function (e) {
    e.preventDefault();

    $(".portfolio__tabs-item").removeClass("portfolio__tabs-item--active");
    $(".portfolio__items").removeClass("portfolio__items--active");

    $(this).addClass("portfolio__tabs-item--active");
    $($(this).attr("href")).addClass("portfolio__items--active");
  });

  $(".portfolio__tabs-item:first").click();
});

