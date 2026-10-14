import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Última red de seguridad del cliente.
 *
 * Sin esto, cualquier excepción durante el render deja la pantalla en blanco
 * sin rastro para el usuario. El caso real que lo motivó: `format()` sobre una
 * fecha malformada lanzaba `RangeError` y tumbaba la aplicación entera.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error no controlado en el árbol de React:", error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        className="min-h-screen flex items-center justify-center bg-background px-4"
        data-testid="error-boundary"
      >
        <div className="max-w-md text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Algo ha ido mal
          </h1>
          <p className="mt-4 text-muted-foreground">
            No hemos podido mostrar esta página. Puedes recargar o volver al inicio.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              className="min-h-[44px] px-6"
              onClick={() => window.location.reload()}
              data-testid="button-error-reload"
            >
              Recargar
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px] px-6"
              onClick={() => {
                window.location.href = "/";
              }}
              data-testid="button-error-home"
            >
              Ir al inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
