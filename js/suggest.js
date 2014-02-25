// require dadata.js
(function() {
    "use strict";

    /**
     * Объединяет элементы массива через разделитель. При этом игнорирует пустые элементы.
     * @param arr Массив
     * @param separator Разделитель. Необязательный параметр, по умолчанию - запятая
     * @returns {string}
     */
    function join(arr /*, separator */) {
        var separator = arguments.length > 1 ? arguments[1] : ", ";
        return arr.filter(function(n){return n}).join(separator);
    }

    /**
     * Базовый объект подсказок
     * Синхронизирует изменение гранулярных полей с полем "одной строкой"
     * @type {{init: Function}}
     */
    var Suggestions = {
        /**
         * Инициализирует подсказки на указанном элементе
         * @param $el   jQuery-элемент ввода одной строкой
         * @param parts Массив jQuery-элементов для гранулярных частей
         * @param separator Разделитель, через который нужно объединять гранулярные части
         * @constructor
         */
        init: function($el, parts, separator) {
            parts.forEach(function($part) {
                $part.change(function() {
                    var partialValues = parts.map(
                        function($el) { return $el.val() }
                    );
                    $el.val(
                        join(partialValues, separator)
                    );
                });
            });
        }
    }

    /**
     * Подскази по адресу
     * @type {{init: Function, forceMoscow: Function, trimResults: Function, formatResult: Function, formatSelected: Function, showSelected: Function}}
     */
    var AddressSuggestions = {

        /**
         * Инициализирует подсказки по адресу на указанном элементе
         * @param $el   jQuery-элемент ввода адреса одной строкой
         * @param parts Массив jQuery-элементов для гранулярных частей адреса
         * @constructor
         */
        init: function($el, parts) {
            var self = this;
            Suggestions.init.call(self, $el, parts, ", ");
            $el.suggestions({
                serviceUrl: DadataApi.DADATA_API_URL + "/suggest/address",
                token: DadataApi.TOKEN,
                selectOnSpace: true,
                maxHeight: 310,
                onSearchStart: self.forceMoscow,
                transformResult: self.trimResults,
                formatResult: self.formatResult,
                onSelect: function(suggestion) {
                    if (suggestion.data) {
                        this.value = self.formatSelected(suggestion);
                        self.showSelected(suggestion);
                    }
                }
            });
        },

        /**
         * Ограничивает поиск Москвой
         * @param params Параметры ajax-запроса
         */
        forceMoscow: function (params) {
            var query = params["query"];
            var pattern = /Москва/i;
            if (!pattern.test(query)) {
                query = "Москва " + query;
            }
            params["query"] = query;
        },

        /**
         * Фильтрует список подсказок
         * @param response Ответ от сервера подсказок
         */
        trimResults: function (response) {
            response.suggestions.splice(7,3);
            response.suggestions.forEach(function(suggestion) {
                suggestion.value = suggestion.value.replace("Россия, ", "");
            });
            return response;
        },

        /**
         * Форматирование элемента списка подсказок в две строки.
         * При отрисовке списка подсказок вызывается для каждого элемента списка.
         * @param suggestion   Подсказка
         * @param currentValue Введенный пользователем текст
         * @returns {string} HTML для элемента списка подсказок
         */
        formatResult: function (suggestion, currentValue) {
            var address = suggestion.data;
            // первая строка - регион, район, город
            var part1 = join([
                address.region,
                join([address.area_type, address.area], " "),
                join([address.city_type, address.city], " ")
            ]);
            // вторая строка - населенный пункт, улица и дом
            var part2 = join([
                join([address.settlement_type, address.settlement], " "),
                join([address.street_type, address.street], " "),
                join([address.house_type, address.house], " ")
            ]);
            // подсветка введенного пользователем текста
            var pattern = '(^|\\s+)(' + $.Suggestions.utils.escapeRegExChars(currentValue) + ')';
            part2 = part2.replace(new RegExp(pattern, 'gi'), '$1<strong>$2<\/strong>')
            var suggestedValue = part2 ?
                "<span class=\"autocomplete-suggestion-region\">" + part1 + "</span>" + "<br>&nbsp;&nbsp;" + part2
                : part1;
            return suggestedValue;
        },

        /**
         * Формирует текстовое представление подсказки, когда пользователь выбирает ее из списка
         * Возвращает все, кроме страны и индекса.
         * @param suggestion
         * @returns {string}
         */
        formatSelected: function (suggestion) {
            var address = suggestion.data;
            return join([
                join([address.region_type, address.region], " "), 
                join([address.area_type, address.area], " "),
                join([address.city_type, address.city], " "),
                join([address.settlement_type, address.settlement], " "), 
                join([address.street_type, address.street], " "),
                join([address.house_type, address.house], " ")
            ]);
        },

        /**
         * Заполняет поля формы гранулярными полями адреса из выбранной подсказки
         * @param suggestion Выбранная подсказка
         */
        showSelected: function (suggestion) {
            var address = suggestion.data;
            $("#address-postal_code").val(address.postal_code);
            $("#address-region").val(
                join([address.region_type, address.region], " ")
            );
            $("#address-city").val(join([
                join([address.area_type, address.area], " "),
                join([address.city_type, address.city], " "),
                join([address.settlement_type, address.settlement], " ")
            ]));
            $("#address-street").val(
                join([address.street_type, address.street], " ")
            );
            $("#address-house").val(
                join([address.house_type, address.house], " ")
            );
        }  // любите работать с кодом? У нас есть отличные вакансии http://hh.ru/employer/15589!
    };

    /**
     * Подсказки по ФИО
     * @type {{init: Function, showSelected: Function}}
     */
    var FullnameSuggestions = {

        /**
         * Инициализирует подсказки по ФИО на указанном элементе
         * @param $el   jQuery-элемент ввода ФИО одной строкой
         * @param parts Массив jQuery-элементов для гранулярных частей ФИО
         * @constructor
         */
        init: function($el, parts) {
            var self = this;
            Suggestions.init.call(self, $el, parts, " ");
            $el.suggestions({
                serviceUrl: DadataApi.DADATA_API_URL + "/suggest/fio",
                token: DadataApi.TOKEN,
                selectOnSpace: true,
                onSelect: function(suggestion) {
                    if (suggestion.data) {
                        self.showSelected(suggestion);
                    }
                }
            });
        },

        /**
         * Заполняет поля формы гранулярными полями ФИО из выбранной подсказки
         * @param suggestion Выбранная подсказка
         */
        showSelected: function (suggestion) {
            var fullname = suggestion.data;
            $("#fullname-surname").val(fullname.surname);
            $("#fullname-name").val(fullname.name);
            $("#fullname-patronymic").val(fullname.patronymic);
        }
    };

    window.AddressSuggestions = AddressSuggestions;
    window.FullnameSuggestions = FullnameSuggestions;

})();
