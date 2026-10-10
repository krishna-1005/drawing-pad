from krita import Krita
from .phone_drawing_pad import PhoneDrawingPadExtension
from .phone_drawing_pad_docker import PhoneDrawingPadDockerFactory

# Register plugin docker factory and extension with Krita
app = Krita.instance()

docker_factory = PhoneDrawingPadDockerFactory()
app.addDockFactory(docker_factory)

extension = PhoneDrawingPadExtension(parent=app)
app.addExtension(extension)
