var tgeojson = {
	coordinates: {
		defaultOptions: function(options) {
			if (typeof options === 'number') {
				// Legacy
				options = {
					precision: options
				};
			} else {
				options = options || {};
			}

			options.precision = options.precision || 5;
			options.factor = options.factor || Math.pow(10, options.precision);
			options.dimension = options.dimension || 2;
			return options;
		},
		encode: function(points, options) {
			options = this.defaultOptions(options);

			var flatPoints = [];
			for (var i = 0, len = points.length; i < len; ++i) {
				var point = points[i];

				if (options.dimension === 2) {
					flatPoints.push(point.lat || point[0]);
					flatPoints.push(point.lng || point[1]);
				} else {
					for (var dim = 0; dim < options.dimension; ++dim) {
						flatPoints.push(point[dim]);
					}
				}
			}
			return this.encodeDeltas(flatPoints, options);
		},

		decode: function(encoded, options) {
			options = this.defaultOptions(options);

			var flatPoints = this.decodeDeltas(encoded, options);

			var points = [];
			for (var i = 0, len = flatPoints.length; i + (options.dimension - 1) < len;) {
				var point = [];

				for (var dim = 0; dim < options.dimension; ++dim) {
					point.push(flatPoints[i++]);
				}

				points.push(point);
			}

			return points;
		},

		encodeDeltas: function(numbers, options) {
			options = this.defaultOptions(options);

			var lastNumbers = [];

			for (var i = 0, len = numbers.length; i < len;) {
				for (var d = 0; d < options.dimension; ++d, ++i) {
					var num = numbers[i];
					var delta = num - (lastNumbers[d] || 0);
					lastNumbers[d] = num;

					numbers[i] = delta;
				}
			}

			return this.encodeFloats(numbers, options);
		},

		decodeDeltas: function(encoded, options) {
			options = this.defaultOptions(options);

			var lastNumbers = [];

			var numbers = this.decodeFloats(encoded, options);
			for (var i = 0, len = numbers.length; i < len;) {
				for (var d = 0; d < options.dimension; ++d, ++i) {
					numbers[i] = lastNumbers[d] = numbers[i] + (lastNumbers[d] || 0);
				}
			}

			return numbers;
		},

		encodeFloats: function(numbers, options) {
			options = this.defaultOptions(options);

			for (var i = 0, len = numbers.length; i < len; ++i) {
				numbers[i] = Math.round(numbers[i] * options.factor);
			}

			return this.encodeSignedIntegers(numbers);
		},

		decodeFloats: function(encoded, options) {
			options = this.defaultOptions(options);

			var numbers = this.decodeSignedIntegers(encoded);
			for (var i = 0, len = numbers.length; i < len; ++i) {
				numbers[i] /= options.factor;
			}

			return numbers;
		},

		encodeSignedIntegers: function(numbers) {
			for (var i = 0, len = numbers.length; i < len; ++i) {
				var num = numbers[i];
				numbers[i] = (num < 0) ? ~(num << 1) : (num << 1);
			}

			return this.encodeUnsignedIntegers(numbers);
		},

		decodeSignedIntegers: function(encoded) {
			var numbers = this.decodeUnsignedIntegers(encoded);

			for (var i = 0, len = numbers.length; i < len; ++i) {
				var num = numbers[i];
				numbers[i] = (num & 1) ? ~(num >> 1) : (num >> 1);
			}

			return numbers;
		},

		encodeUnsignedIntegers: function(numbers) {
			var encoded = '';
			for (var i = 0, len = numbers.length; i < len; ++i) {
				encoded += this.encodeUnsignedInteger(numbers[i]);
			}
			return encoded;
		},

		decodeUnsignedIntegers: function(encoded) {
			var numbers = [];

			var current = 0;
			var shift = 0;

			for (var i = 0, len = encoded.length; i < len; ++i) {
				var b = encoded.charCodeAt(i) - 63;

				current |= (b & 0x1f) << shift;

				if (b < 0x20) {
					numbers.push(current);
					current = 0;
					shift = 0;
				} else {
					shift += 5;
				}
			}

			return numbers;
		},

		encodeSignedInteger: function(num) {
			num = (num < 0) ? ~(num << 1) : (num << 1);
			return this.encodeUnsignedInteger(num);
		},

		// This function is very similar to Google's, but I added
		// some stuff to deal with the double slash issue.
		encodeUnsignedInteger: function(num) {
			var value, encoded = '';
			while (num >= 0x20) {
				value = (0x20 | (num & 0x1f)) + 63;
				encoded += (String.fromCharCode(value));
				num >>= 5;
			}
			value = num + 63;
			encoded += (String.fromCharCode(value));

			return encoded;
		}
	},
	encode: function(data) {
		var schemas = {}, maxSchemaIndex = 0;

		function encodeArray(data) {
			var i, encoded = [];
			for (i = 0; i < data.length; i++) {
				encoded = encoded.concat(encode(data[i]));
			}
			return encoded;
		}

		function encodeObject(data) {
			var keys = Object.keys(data),
				i, k, encoded = [keys, []];

			for (i = 0; i < keys.length; i++) {
				var current = encode(data[keys[i]]);
				if (Array.isArray(current) && Array.isArray(current[0])) {
					for (k = 2; k < current.length;) {
						if (current.length % 2 !== 0)
							current[1] = current[1].concat(current[2]);
						current.splice(2, 1);
					}
				}
				encoded[1].push(current);
			}
			return encoded;
		}

		function encode(data) {
			if (typeof data !== 'object' || !data) {
				return data;
			} else if (Array.isArray(data)) {
				return encodeArray(data);
			} else {
				return encodeObject(data);
			}
		}

		

		var properties_keys = Object.keys(data.features[0].properties);
		data.schema = properties_keys;

		for (var i = 0; i < data.features.length; i++) {
			// encode properties
			var dataArray = [];
			for (var k = 0; k < properties_keys.length; k++) {
				dataArray.push(data.features[i].properties[properties_keys[k]]);
			}
			data.features[i].properties = dataArray;


			// encode coordinates
			var coords = [];

			switch (data.features[i].geometry.type) {
				case "Point":
					coords = tgeojson.coordinates.encode([data.features[i].geometry.coordinates]);
					break;
				case "Line":
				case "Polygon":
					if (data.features[i].geometry.coordinates[0].length == 2) {
						coords = tgeojson.coordinates.encode(data.features[i].geometry.coordinates);
						break;
					}
				default:
					for (var l = 0; l < data.features[i].geometry.coordinates.length; l++) {
						coords.push(tgeojson.coordinates.encode(data.features[i].geometry.coordinates[l]));
					}
					break;
			}

			data.features[i].geometry.coordinates = coords;
		}

		return encode(data);
	},
	decode: function(data) {
		function isArray(data) {
			return Object.prototype.toString.call(data) === "[object Array]";
		}

		function decode(data) {
			if (isArray(data) && isArray(data[0])) {
				var array = [],
					data_size = data[1].length / data[0].length;

				for (var i = 0; i < data_size; i++) {
					var current = {}, length = data[0].length;

					for (var k = 0; k < length; k++) {
						current[data[0][k]] = decode(data[1][i * length + k]); // ?????????
					}
					array.push(current);
				}
				return array.length > 1 ? array : array[0];
			} else {
				return data;
			}
		}

		data = decode(data);
		var properties_keys = data.schema;

		if (!isArray(data.features)) data.features = [data.features];

		for (var i = 0; i < data.features.length; i++) {

			// encode properties
			var dataObj = {};
			for (var k = 0; k < properties_keys.length; k++) {
				dataObj[properties_keys[k]] = data.features[i].properties[k];
			}
			data.features[i].properties = dataObj;

			// decode coordinates
			var coords = [];


			switch (data.features[i].geometry.type) {
				case "Point":
					coords = tgeojson.coordinates.decode(data.features[i].geometry.coordinates)[0];
					break;
				case "Line":
				case "Polygon":
					if (data.features[i].geometry.coordinates[0].length == 2) {
						coords = tgeojson.coordinates.decode(data.features[i].geometry.coordinates);
						break;
					}
				default:
					for (var l = 0; l < data.features[i].geometry.coordinates.length; l++) {
						coords.push(tgeojson.coordinates.decode(data.features[i].geometry.coordinates[l]));
					}
					break;
			}

			data.features[i].geometry.coordinates = coords;
		}

		return data;
	}
};

module.exports = tgeojson;