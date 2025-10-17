import { useState, useEffect, useCallback } from 'react';
import { useRestaurant } from '../contexts/RestaurantContext';
import toast from 'react-hot-toast';

export const useGoogleMaps = () => {
  const { restaurant } = useRestaurant();
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const apiKey = restaurant?.config?.delivery?.googleMapsApiKey;

    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    if (document.querySelector('script[id="google-maps-script"]')) {
      const checkInterval = setInterval(() => {
        if(window.google?.maps) {
          setIsLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return;
    }

    if (apiKey) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      script.id = 'google-maps-script';

      script.onload = () => setIsLoaded(true);
      script.onerror = () => {
        const errorMessage = 'No se pudo cargar el script de Google Maps. Revisa la API Key.';
        setError(new Error(errorMessage));
        toast.error(errorMessage);
      };

      document.head.appendChild(script);
    }
  }, [restaurant?.config?.delivery?.googleMapsApiKey]);

  const initAutocomplete = (inputRef) => {
    if (isLoaded && inputRef.current && window.google) {
      try {
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current);
      } catch (e) {
        console.error("Error al inicializar autocompletado de Google Maps:", e);
      }
    }
  };

  const calculateDistance = useCallback((origin, destination) => {
    return new Promise((resolve, reject) => {
        // --- Cláusula de Guarda Profesional ---
        if (!isLoaded || !window.google || !window.google.maps?.DistanceMatrixService) {
            return reject(new Error('La API de Google Maps no está cargada o lista.'));
        }

        const service = new window.google.maps.DistanceMatrixService();
        service.getDistanceMatrix(
            {
                origins: [origin],
                destinations: [destination],
                travelMode: 'DRIVING',
                unitSystem: window.google.maps.UnitSystem.METRIC,
            },
            (response, status) => {
                if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
                    const distanceInMeters = response.rows[0].elements[0].distance.value;
                    resolve(distanceInMeters / 1000); // Devuelve en KM
                } else {
                    reject(new Error(`Error al calcular la distancia: ${status}`));
                }
            }
        );
    });
  }, [isLoaded]); // Depende de isLoaded para asegurar que la API esté lista

  return { isLoaded, error, initAutocomplete, calculateDistance };
};

