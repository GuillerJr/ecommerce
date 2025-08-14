/**
 * @fileoverview Hook de React personalizado para detectar si el dispositivo
 * se encuentra en un viewport de tamaño móvil.
 * Esto es útil para renderizar componentes de manera condicional en el lado del cliente.
 */

import * as React from "react"

// Define el punto de quiebre para considerar un dispositivo como móvil.
const MOBILE_BREAKPOINT = 768

/**
 * Hook `useIsMobile` que devuelve `true` si el ancho de la ventana
 * es menor que `MOBILE_BREAKPOINT`.
 * 
 * @returns {boolean} `true` si es móvil, `false` en caso contrario.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    // Función para verificar el tamaño de la ventana y actualizar el estado.
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Verifica al montar el componente y añade un listener para el evento de redimensionamiento.
    checkDevice()
    window.addEventListener("resize", checkDevice)
    
    // Limpia el listener cuando el componente se desmonta.
    return () => {
      window.removeEventListener("resize", checkDevice)
    }
  }, [])

  return isMobile
}
