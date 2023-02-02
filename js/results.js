"use strict";

let resultsData;

function initialise() {
    $.ajax({
        url: "results_data.json",
        dataType: 'json',
        success: function (json) {
            resultsData = json["results"];
            populatePage();
        }
    });
}

function populatePage() {
    let resultsContainerElement = $("#results");

    $.each(resultsData, function (index, result) {
        let resultId = result["id"];

        resultsContainerElement.append(
            '<p>' + result["description"] + '</p>' +
            '<div id="' + resultId + '" class="carousel slide" data-ride="carousel" data-interval="false">' +
            '    <ol class="carousel-indicators">' +
            '    </ol>' +
            '    <div class="carousel-inner" role="listbox">' +
            '    </div>' +
            '    <a class="left carousel-control" href="#' + resultId + '" role="button" data-slide="prev">' +
            '        <span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span>' +
            '        <span class="sr-only">Previous</span>' +
            '    </a>' +
            '    <a class="right carousel-control" href="#' + resultId + '" role="button" data-slide="next">' +
            '        <span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span>' +
            '        <span class="sr-only">Next</span>' +
            '    </a>' +
            '</div>' +
            '<hr/>'
        );

        let resultCarouselElement = $('#' + resultId);
        for (let imageIndex = 0; imageIndex < result["images"].length; imageIndex++) {
            resultCarouselElement.find('.carousel-indicators').append(
                '<li data-target="#' + resultId + '" data-slide-to="' + imageIndex + '" ' + (imageIndex === 0 ? 'class="active"' : '') + '></li>'
            );
            resultCarouselElement.find('.carousel-inner').append(
                '<div class="item ' + (imageIndex === 0 ? 'active' : '') + '">' +
                '    <img src="' + result["images"][imageIndex] + '" alt="Detailing job result">' +
                '</div>'
            );
        }
    });

    resultsContainerElement.append(
      '<a class="btn btn-primary pull-right" onclick="window.scrollTo({top: 0, behavior: \'smooth\'});">Back to Top</a>'
    );
}

$(function () {
    initialise();
});