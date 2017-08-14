$(document).ready(function(){
    var max_height = function(){
        return $(document).height() - $(window).height();
    }

    var get_rpi_value = function(){
        return $(window).scrollTop();
    }

    if ('max' in document.createElement('progress')){
        var rpi_bar = $('progress');

        rpi_bar.attr({ max: max_height() });

        $(document).on('scroll', function(){
            /* On scroll update the value attr */
            rpi_bar.attr({ value: get_rpi_value() });
        });

        $(window).resize(function(){
            /* On resize, update both max & value attr */
            rpi_bar.attr({ max: max_height(), value: get_rpi_value() });
        });
    } else {
        var rpi_bar = $('.progress-bar'),
            max = max_height(),
            value, width;

        var value_to_rpi_width = function(){
            value = get_rpi_value();
            width = (value/max) * 100;
            width = width + '%';
            return width;
        }

        var set_rpi_width = function(){
            rpi_bar.css({ width: value_to_rpi_width() });
        }

        $(document).on('scroll', set_rpi_width);
        $(window).on('resize', function(){
            max = max_height();
            set_rpi_width();
        });
    }
});
